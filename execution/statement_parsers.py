"""Parse MTB bank and EBL credit card statements (text already extracted from the PDF)
and build the monthly series used by the dashboard."""
import re
from collections import defaultdict

NUM = r"[\d,]+\.\d{2}"
START_RE = re.compile(r"(\d{2})/(\d{2})/(\d{2})\s+(\d{2}:\d{2})\s+")
BAL_RE = re.compile(r"(\d{1,3}(?:,\d{3})*\.\d{2})Cr")
CAND_RE = re.compile(r"\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}")
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def money(s):
    return round(float(s.replace(",", "")), 2)


class StatementError(Exception):
    pass


def parse_mtb(text):
    body = text.split("=== PAGE 1 ===", 1)[-1]
    head = re.search(
        rf"Opening Balance.*?\n({NUM})Cr\s+({NUM})\s+({NUM})\s+({NUM})Cr", text, re.S
    )
    if not head:
        raise StatementError("MTB header totals not found")
    opening = money(head.group(1))
    header = {
        "withdrawals": money(head.group(2)),
        "deposits": money(head.group(3)),
        "closing": money(head.group(4)),
    }
    starts = list(START_RE.finditer(body))
    rows, prev, unmatched = [], opening, []
    for i, s in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(body)
        record = body[s.end():end]
        bal = BAL_RE.search(record)
        if not bal:
            unmatched.append(record[:80])
            continue
        balance = money(bal.group(1))
        delta = round(balance - prev, 2)
        deposit = round(delta, 2) if delta > 0 else 0.0
        withdrawal = round(-delta, 2) if delta < 0 else 0.0
        if delta != 0:
            # Confirm the movement is actually printed in the record.
            cands = {money(c.group(0)) for c in CAND_RE.finditer(record) if c.start() != bal.start()}
            if round(abs(delta), 2) not in cands:
                pair = next(
                    ((x, y) for x in cands for y in cands if x != y and round(x - y, 2) == delta), None
                )
                if pair:
                    deposit, withdrawal = pair
                else:
                    unmatched.append(record[:80])
        desc = " ".join(record[: (bal.start())].split())
        desc = re.sub(rf"\s*{NUM}\s*$", "", desc)
        rows.append({
            "date": f"20{s.group(3)}-{s.group(2)}-{s.group(1)}",
            "description": desc,
            "deposit": deposit,
            "withdrawal": withdrawal,
            "balance": balance,
        })
        prev = balance
    if unmatched:
        raise StatementError(f"{len(unmatched)} MTB record(s) could not be matched: {unmatched[0]}")
    deposits = round(sum(r["deposit"] for r in rows), 2)
    withdrawals = round(sum(r["withdrawal"] for r in rows), 2)
    if (deposits, withdrawals, prev) != (header["deposits"], header["withdrawals"], header["closing"]):
        raise StatementError(
            f"MTB totals do not match statement header: rows D{deposits} W{withdrawals} C{prev} "
            f"vs header D{header['deposits']} W{header['withdrawals']} C{header['closing']}"
        )
    return {"kind": "mtb", "rows": rows}


HIST_NUM_RE = re.compile(r"\d{1,3}(?:,\d{3})*\.\d{2}")


def parse_mtb_history(text):
    """Older full-history MTB layout: separate Withdrawal, Deposit and Balance columns with no 'Cr'
    after the balance. The last three amounts of each record are withdrawal, deposit and balance."""
    body = text.split("=== PAGE 1 ===", 1)[-1]
    head = re.search(rf"Closing Balance\s*\n\s*({NUM})Cr\s+({NUM})\s+({NUM})\s+({NUM})Cr", text)
    if not head:
        raise StatementError("history header totals not found")
    opening = money(head.group(1))
    header = {"withdrawals": money(head.group(2)), "deposits": money(head.group(3)), "closing": money(head.group(4))}
    starts = list(START_RE.finditer(body))
    rows, prev = [], opening
    for i, s in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(body)
        # The amounts are on the first line of each record. Later lines are page footers and wrapped text.
        line = body[s.end():end].split("\n")[0]
        nums = list(HIST_NUM_RE.finditer(line))
        if len(nums) < 3:
            raise StatementError(f"history record has fewer than 3 amounts: {line[:80]!r}")
        w, d, b = (money(n.group(0)) for n in nums[-3:])
        if round(prev - w + d - b, 2) != 0:
            raise StatementError(f"history balance does not follow on {s.group(3)}/{s.group(2)}: {line[:80]!r}")
        desc = re.sub(r"^\d{2}/\d{2}/\d{2}\s+", "", line[:nums[-3].start()])
        date = f"20{s.group(3)}-{s.group(2)}-{s.group(1)}"
        if s.group(3) == "70":  # placeholder date in some rows; the description states the real one
            dated = re.search(r"DATED (\d{2})/(\d{2})/(\d{4})", desc)
            date = f"{dated.group(3)}-{dated.group(2)}-{dated.group(1)}" if dated else (rows[-1]["date"] if rows else date)
        rows.append({
            "date": date,
            "description": " ".join(desc.split()),
            "deposit": d,
            "withdrawal": w,
            "balance": b,
        })
        prev = b
    deposits = round(sum(r["deposit"] for r in rows), 2)
    withdrawals = round(sum(r["withdrawal"] for r in rows), 2)
    if (deposits, withdrawals, prev) != (header["deposits"], header["withdrawals"], header["closing"]):
        raise StatementError(
            f"history totals do not match header: rows D{deposits} W{withdrawals} C{prev} "
            f"vs header D{header['deposits']} W{header['withdrawals']} C{header['closing']}"
        )
    return {"kind": "mtb", "rows": rows}


def parse_ebl(text):
    total_m = re.search(rf"Total Outstanding :\s+({NUM})BDT", text)
    if not total_m:
        raise StatementError("EBL header totals not found")
    # Statements with no carried-over balance have no "Previous Balance" row.
    prev_m = re.search(rf"Previous Balance BDT\s+({NUM})", text, re.I)
    previous = money(prev_m.group(1)) if prev_m else 0.0
    row_re = re.compile(r"^(\d{2}-[A-Za-z]{3}-\d{4}) (.+?) BDT\s+(-?[\d,]+\.\d{2})BDT", re.M)
    rows = []
    for m in row_re.finditer(text):
        day, mon, yr = m.group(1).split("-")
        if m.group(2).lower().startswith("previous balance"):
            continue
        month_num = MONTHS.index(mon.title()) + 1
        amount = money(m.group(3))
        rows.append({
            "date": f"{yr}-{month_num:02d}-{day}",
            "description": " ".join(m.group(2).split()),
            "amount": amount,  # positive = spend, negative = payment
        })
    net = round(sum(r["amount"] for r in rows), 2)
    expected = round(money(total_m.group(1)) - previous, 2)
    if net != expected:
        raise StatementError(f"EBL rows total {net} but statement implies {expected}")
    return {"kind": "ebl", "rows": rows}


def build_monthly(statements):
    """statements: list of {'kind', 'rows'} from all processed PDFs.
    MTB deposits are income; card purchases and MTB withdrawals are spending.
    Card bill payments (money moved from MTB to the card) are not counted as spending."""
    months = defaultdict(lambda: {"income": 0.0, "salary": 0.0, "spent": 0.0, "tx": 0, "balance": None, "date": ""})
    for st in statements:
        for r in st["rows"]:
            iso = r["date"][:7]
            m = months[iso]
            if st["kind"] == "mtb":
                m["tx"] += 1
                m["income"] += r["deposit"]
                if "salary" in r["description"].lower():
                    m["salary"] += r["deposit"]
                if r["withdrawal"] and not _is_card_payment(r["description"]):
                    m["spent"] += r["withdrawal"]
                if r["date"] >= m["date"]:
                    m["balance"], m["date"] = r["balance"], r["date"]
            else:
                if r["amount"] > 0:
                    m["spent"] += r["amount"]
                    m["tx"] += 1
    series = []
    for iso in sorted(months):
        m = months[iso]
        y, mo = iso.split("-")
        series.append({
            "label": f"{MONTHS[int(mo) - 1]} {y}",
            "iso": iso,
            "spent": round(m["spent"], 2),
            "income": round(m["income"], 2),
            "salary": round(m["salary"], 2),
            "accrualSalary": round(m["salary"], 2),
            "savings": round(m["income"] - m["spent"], 2),
            "normalizedSavings": round(m["income"] - m["spent"], 2),
            "balance": round(m["balance"], 2) if m["balance"] is not None else 0.0,
            "tx": m["tx"],
        })
    # Months without a bank statement keep the last known balance.
    last_balance = 0.0
    for m in series:
        if m["balance"]:
            last_balance = m["balance"]
        else:
            m["balance"] = last_balance
    return series


def build_payload(statements):
    """Full payload in the shape the dashboard reads: monthly_series, yearly, overview, highlights."""
    return payload_from_series(build_monthly(statements))


def payload_from_series(series):
    """Same payload, computed from a monthly series (used after merging with the base history)."""
    if not series:
        raise StatementError("no months to publish")
    yearly = {}
    for m in series:
        y = yearly.setdefault(m["iso"][:4], {"income": 0.0, "spent": 0.0, "savings": 0.0, "tx": 0})
        y["income"] += m["income"]
        y["spent"] += m["spent"]
        y["savings"] += m["savings"]
        y["tx"] += m["tx"]
    for y in yearly.values():
        for k in y:
            y[k] = round(y[k], 2) if k != "tx" else y[k]
        y["normalizedSavings"] = y["savings"]
    n = len(series)
    total_income = round(sum(m["income"] for m in series), 2)
    total_spent = round(sum(m["spent"] for m in series), 2)
    total_savings = round(total_income - total_spent, 2)
    last = series[-1]
    best = max(series, key=lambda m: m["savings"])
    worst = min(series, key=lambda m: m["savings"])
    hi_spend = max(series, key=lambda m: m["spent"])
    hi_income = max(series, key=lambda m: m["income"])
    busiest = max(series, key=lambda m: m["tx"])
    overview = {
        "total_months": n,
        "total_income": total_income,
        "total_spent": total_spent,
        "total_salary": round(sum(m["salary"] for m in series), 2),
        "total_savings": total_savings,
        "total_transactions": sum(m["tx"] for m in series),
        "latest_balance": last["balance"],
        "latest_month": last["label"],
        "avg_monthly_spend": round(total_spent / n, 2),
        "avg_monthly_income": round(total_income / n, 2),
        "avg_monthly_savings": round(total_savings / n, 2),
        "positive_months": sum(1 for m in series if m["savings"] >= 0),
        "negative_months": sum(1 for m in series if m["savings"] < 0),
        "savings_rate_pct": round(total_savings / total_income * 100, 2) if total_income else 0,
    }
    highlights = {
        "best_month": best["label"], "best_month_savings": best["savings"],
        "worst_month": worst["label"], "worst_month_savings": worst["savings"],
        "highest_spend_month": hi_spend["label"], "highest_spend_amount": hi_spend["spent"],
        "highest_income_month": hi_income["label"], "highest_income_amount": hi_income["income"],
        "busiest_month": busiest["label"], "busiest_tx_count": busiest["tx"],
    }
    return {"overview": overview, "highlights": highlights, "yearly": yearly, "monthly_series": series}


MONTH_WORDS = {m.lower(): i for i, m in enumerate(
    ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]) if m}
MONTH_WORDS.update({k[:3]: v for k, v in list(MONTH_WORDS.items())})
MONTH_WORDS.update({"marc": 3, "sept": 9})
BONUS_RE = re.compile(r"bonus|wppf|profit participation|festival", re.I)
SALARY_RE = re.compile(r"salary", re.I)
MONTH_IN_DESC_RE = re.compile(r"(january|february|march|marc|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\W*(\d{4})?", re.I)


def classify_income(desc, date):
    """Returns (category, salary_month) for an income row.
    category is one of: Salary, Bonus, Interest & government savings, Mobile purchase payment,
    Refunds & reversals, Cash & RTGS deposits, Loans & repayments, Transfers from people, Other income.
    salary_month is the month the salary is for: the month named in the description, otherwise the month it arrived."""
    if BONUS_RE.search(desc):
        return "Bonus", None
    if SALARY_RE.search(desc):
        m = MONTH_IN_DESC_RE.search(desc)
        if m and MONTH_WORDS.get(m.group(1).lower()):
            year = int(m.group(2)) if m.group(2) else int(date[:4])
            return "Salary", f"{year}-{MONTH_WORDS[m.group(1).lower()]:02d}"
        return "Salary", date[:7]
    if re.search(r"^@TDS", desc, re.I):
        return "Tax adjustments (TDS)", None
    if re.search(r"mobile purchase", desc, re.I):
        return "Mobile purchase payment", None
    if re.search(r"interest|treasury|GPO", desc, re.I):
        return "Interest & government savings", None
    if re.search(r"REV[/-]|reversal|\bRET\b|refund|cash ret|^credit-", desc, re.I):
        return "Refunds & reversals", None
    if re.search(r"^cash$|cash deposit|rtgs", desc, re.I):
        return "Cash & RTGS deposits", None
    if re.search(r"\bloan", desc, re.I):
        return "Loans & repayments", None
    if re.search(r"^(EFT|MB/FT|IB/FT|NPSB|MFS|MB/bKash)", desc, re.I):
        return "Transfers from people", None
    return "Other income", None


GENERIC_NOTES = {"ok", "cash", "transfer", "tr", "food", "adjust", "fund", "personal", "food", "chaap", "kitkat", "ttansfer", "dhar", "bolia", "iftaar", "medici", "consumer produ", "thanks a lot b", "loan", "loan ret", "loan return", "return", "ret"}


def income_sender(desc):
    """The name in the statement for a transfer, or a short label when the statement has no name."""
    parts = [p.strip() for p in re.split(r"[/~]", desc) if p.strip()]
    if re.match(r"EFT", desc, re.I) and len(parts) > 2:
        return " ".join(parts[2].split()).title()
    if re.match(r"(MB/FT|IB/FT|MB/bKash)", desc, re.I) and parts:
        last = " ".join(parts[-1].split())
        if last.lower() in GENERIC_NOTES or re.fullmatch(r"[\d\s.]+", last):
            return "Unnamed transfer"
        return last.title()
    if re.match(r"NPSB", desc, re.I):
        return "Bank transfer (NPSB)"
    if re.match(r"MFS", desc, re.I):
        return "Mobile wallet transfer"
    return None


def salary_timing(date, salary_month):
    """When the salary arrived compared with the month it is for."""
    arrived_month, day = date[:7], int(date[8:10])
    if arrived_month == salary_month and day >= 25:
        return "Paid at month end"
    if arrived_month != salary_month:
        y, mo = map(int, salary_month.split("-"))
        nxt = f"{y + (mo == 12)}-{(mo % 12) + 1:02d}"
        if arrived_month == nxt and day <= 5:
            return "Paid on 1st-5th of next month"
    return "Paid mid-month"


# Known deposits that combine two things. Split by the owner's own statement of what they were.
SPLIT_RULES = [
    {
        "d": "2026-03-01", "a": -94881.0,
        "keep": -74881.0,  # salary for February 2026
        "extra": {"d": "2026-03-01", "t": "Mobile purchase payment (bi-yearly, first installment)", "a": -20000.0, "s": "MTB", "k": "income"},
    },
]


# Checked in order; the first match wins. Spending rows only (income is classified separately).
EXPENSE_RULES = [
    ("Card bill payments", r"card ?payment|skybanking|ebl card|ebl credit"),
    ("Tax deducted", r"^@TDS|\btax\b"),
    ("Cash withdrawals", r"cash withdraw|\bCW-|\bATM\b|\bRATM|withdrawal"),
    ("Fees & VAT", r"\bVAT\b|\bfee\b|risk assurance|verification|\bcharges?\b|excise"),
    ("Installments (EMI)", r"installment"),
    ("Donations", r"donation"),
    ("Mobile wallet (bKash)", r"bkash|addmoney|mobile wallet|\bLB\|"),
    ("Transfers to accounts", r"standing instruction|rtgs|create fd|fixed deposit"),
    ("Cheques", r"^chq"),
    ("Entertainment", r"cinema|cineplex|bay watch|entertain"),
    ("Food & dining", r"foodpanda|domino|chillox|tasty|kudos|restaurant|cafe|coffee|pizza|kfc|sweet|bakery|fried|fry bucket|chicken|burger|hotel|banolata|\bbf\b|sharf|smoothie|\btea\b|food court|khana|runcha|palongki|crust and beans|sailor"),
    ("Shopping & groceries", r"meena bazar|chaldal|shop|\bmart\b|shwapno|seven to eleven|store|pickaboo|best buy|aarong|daraz|electronics|pharmacy|bazar|fabric|miniso|sony|smart banasree|sumash|\btex\b"),
    ("Transport & travel", r"uber|pathao|shohoz|railway|gozayaan|share ?trip|airline|fuel|petrol|\bride\b|\bbus\b|dallas express|express mirpur"),
    ("Bills & utilities", r"dpdc|titas|desco|grameenphone|mobiletopup|topup|internet|\bbill\b|onnorokom"),
    ("Health", r"hospital|clinic|doctor|medic|diagnostic"),
    ("Subscriptions & online", r"netflix|spotify|apple|google|openai|icloud|facebook|claude|health connect"),
]
# Bank channel words that are not a payee name.
BANK_CHANNELS = {"npsb", "nps", "ibft", "bdt", "bkash", "ibft npsb", "fro", "gpt", "gp"}


def expense_category(desc):
    """Category of a spending row, from the statement description."""
    for name, pattern in EXPENSE_RULES:
        if re.search(pattern, desc, re.I):
            return name
    if re.match(r"(MB/|IB/|NPSB|EFT|MFS)", desc, re.I):
        return "Transfers to people"
    if re.match(r"(POS-|EBL)", desc, re.I):
        return "Card purchases (other)"
    return "Other spending"


def expense_payee(desc):
    """The name in the statement for an expense: a merchant, a person, or a bank transfer."""
    parts = [p.strip() for p in re.split(r"[/~|]", desc) if p.strip()]
    if re.match(r"POS-", desc, re.I):
        name = re.sub(r"^POS-", "", desc, flags=re.I)
        name = re.split(r"-\d", name)[0]
        return " ".join(name.split()).title()
    if re.match(r"(MB/FT|IB/FT|MB/bKash)", desc, re.I) and parts:
        last = " ".join(parts[-1].split())
        if last.lower() in GENERIC_NOTES or re.fullmatch(r"[\d\s.]+", last):
            return "Unnamed transfer"
        return last.title()
    if re.match(r"(MB/IBFT|IB/IBFT|MB/BDT|MB/CrCardPayment)", desc, re.I):
        last = " ".join(parts[-1].split()) if parts else ""
        if not last or last.lower() in BANK_CHANNELS or re.fullmatch(r"[\d\s.%]+", last):
            return "Bank transfer"
        return last.title()
    if re.match(r"EFT", desc, re.I) and len(parts) > 2:
        return " ".join(parts[2].split()).title()
    if re.match(r"NPSB", desc, re.I):
        return "Bank transfer (NPSB)"
    return " ".join(re.split(r"\s{2,}|\s\d{4,}", desc)[0].split()).title() or None


def annotate_expenses(transactions):
    """Adds the category and payee to every spending and card payment row. A card bill payment
    that was saved as spending is moved to payments, so it is not counted twice."""
    for t in transactions:
        if t["k"] == "spend":
            t["e"] = expense_category(t["t"])
            if t["e"] == "Card bill payments":
                t["k"] = "payment"
            else:
                t["ename"] = expense_payee(t["t"])
        if t["k"] == "payment":
            t["e"] = "Card bill payments"
    return transactions


def annotate_income(transactions):
    """Splits known combined deposits, then adds the category to every income row.
    Salary rows also get the salary month and timing."""
    out = []
    for t in transactions:
        t = dict(t)
        rule = next((r for r in SPLIT_RULES if t["d"] == r["d"] and round(t["a"], 2) == r["a"]), None)
        if rule:
            t["a"] = rule["keep"]
            out.append(t)
            out.append(dict(rule["extra"]))
        else:
            out.append(t)
    for t in out:
        if t["k"] != "income":
            continue
        cat, sal_month = classify_income(t["t"], t["d"])
        t["c"] = cat
        t["src"] = income_sender(t["t"])
        if cat == "Salary":
            t["m"] = sal_month
            t["tm"] = salary_timing(t["d"], sal_month)
    return out


def build_transactions(statements, after_iso):
    """Individual transactions for the Transactions page. a > 0 is money out, a < 0 is money in.
    k: spend (purchase or withdrawal), income (deposit), payment (card bill payment or card credit)."""
    out = []
    for st in statements:
        for r in st["rows"]:
            if r["date"][:7] <= after_iso:
                continue
            if st["kind"] == "mtb":
                if r["deposit"] > 0:
                    out.append({"d": r["date"], "t": r["description"], "a": -r["deposit"], "s": "MTB", "k": "income"})
                if r["withdrawal"] > 0:
                    kind = "payment" if _is_card_payment(r["description"]) else "spend"
                    out.append({"d": r["date"], "t": r["description"], "a": r["withdrawal"], "s": "MTB", "k": kind})
            else:
                kind = "spend" if r["amount"] > 0 else "payment"
                out.append({"d": r["date"], "t": r["description"], "a": r["amount"], "s": "EBL card", "k": kind})
    out.sort(key=lambda x: x["d"], reverse=True)
    return out


CARD_PAYMENT_HINTS = ("SKYBANKING", "EBL CARD", "EBL CREDIT", "CARD PAYMENT", "CARDPAYMENT")


def _is_card_payment(description):
    d = description.upper()
    return any(h in d for h in CARD_PAYMENT_HINTS)
