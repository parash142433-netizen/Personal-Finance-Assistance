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
    series = build_monthly(statements)
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


CARD_PAYMENT_HINTS = ("SKYBANKING", "EBL CARD", "EBL CREDIT", "CARD PAYMENT")


def _is_card_payment(description):
    d = description.upper()
    return any(h in d for h in CARD_PAYMENT_HINTS)
