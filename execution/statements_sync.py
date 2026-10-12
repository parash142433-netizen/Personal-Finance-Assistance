"""Check the Banking Drive folder, parse new statement PDFs, validate them, and publish
the dashboard data to Cloudflare KV (read by ledgr-finance-proxy).

Runs in GitHub Actions every 5 minutes. PDFs are only held in memory and never committed.
Secrets come from environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
GOOGLE_REFRESH_TOKEN, MTB_PDF_PASSWORD, EBL_PDF_PASSWORD, CLOUDFLARE_API_TOKEN."""
import base64
import io
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

from pypdf import PdfReader

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from statement_parsers import (  # noqa: E402
    StatementError, build_monthly, build_transactions, parse_ebl, parse_mtb, parse_mtb_history, payload_from_series,
)

FOLDER_ID = "195e6CTfUf73ELYA8zlWs-D486xnL3aso"  # the Banking folder
CF_ACCOUNT = "e8382c2665bb696adbfb91b935627b32"
CF_NAMESPACE = "b8ce5e4dcd7f47d1b18f92094d572dca"  # ledgr-data KV namespace
STATE_KEY = "statements_state"
DATA_KEY = "finance_data"
ERROR_KEY = "last_error"
BASE_KEY = "base_history"  # Sep 2021 - Jul 2026 monthly series from the spreadsheet
# Full bank history 2021-2026 (older layout). Not parsed: the base history already covers it.
IGNORED_FILE_IDS = {"1la6QufIK1rv9F8HWs1dkUKgXijvaSXa9"}


def http(method, url, headers=None, body=None):
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def env(name):
    value = os.environ.get(name, "")
    if not value:
        raise StatementError(f"secret {name} is not set")
    return value


def google_token():
    body = urllib.parse.urlencode({
        "client_id": env("GOOGLE_CLIENT_ID"),
        "client_secret": env("GOOGLE_CLIENT_SECRET"),
        "refresh_token": env("GOOGLE_REFRESH_TOKEN"),
        "grant_type": "refresh_token",
    }).encode()
    status, raw = http("POST", "https://oauth2.googleapis.com/token",
                       {"Content-Type": "application/x-www-form-urlencoded"}, body)
    if status != 200:
        raise StatementError(f"Google token refresh failed: HTTP {status}")
    return json.loads(raw)["access_token"]


def list_pdfs(token):
    q = f"'{FOLDER_ID}' in parents and trashed = false and mimeType = 'application/pdf'"
    url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode({
        "q": q, "fields": "files(id,name,modifiedTime)", "pageSize": "200",
    })
    status, raw = http("GET", url, {"Authorization": f"Bearer {token}"})
    if status != 200:
        raise StatementError(f"Drive list failed: HTTP {status}")
    return json.loads(raw)["files"]


def download(token, file_id):
    status, raw = http("GET", f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
                       {"Authorization": f"Bearer {token}"})
    if status != 200:
        raise StatementError(f"Drive download failed: HTTP {status}")
    return raw


def read_statement(data):
    """Try each password. Returns (kind, text) for whichever statement type opens."""
    for kind, pwd_name, marker in (
        ("mtb", "MTB_PDF_PASSWORD", "STATEMENT OF ACCOUNT"),
        ("ebl", "EBL_PDF_PASSWORD", "Electronic Credit Card Statement"),
    ):
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted and reader.decrypt(env(pwd_name)) == 0:
            continue
        text = "\n".join(f"=== PAGE {i + 1} ===\n" + (p.extract_text() or "") for i, p in enumerate(reader.pages))
        if marker in text:
            return kind, text
    return None, None


def kv_url(key):
    return (f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}"
            f"/storage/kv/namespaces/{CF_NAMESPACE}/values/{urllib.parse.quote(key)}")


def cf_headers():
    return {"Authorization": f"Bearer {env('CLOUDFLARE_API_TOKEN')}"}


def kv_get_json(key, default):
    status, raw = http("GET", kv_url(key), cf_headers())
    if status == 404:
        return default
    if status != 200:
        raise StatementError(f"Cloudflare KV read failed for {key}: HTTP {status}")
    return json.loads(raw)


def kv_put(key, value):
    status, raw = http("PUT", kv_url(key), {**cf_headers(), "Content-Type": "application/json"},
                       json.dumps(value).encode())
    if status not in (200, 201):
        raise StatementError(f"Cloudflare KV write failed for {key}: HTTP {status} {raw[:200]!r}")


REPO = "parash142433-netizen/Personal-Finance-Assistance"
DATA_PATH = "data/finance_data.json"  # the website is built from this file


def publish_to_repo(payload):
    """Save the dashboard data to the repo and start the site build. The site is baked from
    this file at build time. Commits made with GITHUB_TOKEN don't start other workflows,
    so the build is started directly. Returns False if nothing changed."""
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        raise StatementError("GITHUB_TOKEN is not set, so the site cannot be rebuilt")
    content = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    api = f"https://api.github.com/repos/{REPO}/contents/{DATA_PATH}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "ledgr-statements-sync",
    }
    status, raw = http("GET", api + "?ref=main", headers)
    sha = None
    if status == 200:
        current = json.loads(raw)
        sha = current["sha"]
        if base64.b64decode(current["content"]).decode("utf-8") == content:
            return False
    elif status != 404:
        raise StatementError(f"GitHub read failed for {DATA_PATH}: HTTP {status}")
    body = {
        "message": f"data: statements up to {payload['overview']['latest_month']}",
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "branch": "main",
    }
    if sha:
        body["sha"] = sha
    status, raw = http("PUT", api, {**headers, "Content-Type": "application/json"}, json.dumps(body).encode())
    if status not in (200, 201):
        raise StatementError(f"GitHub commit failed for {DATA_PATH}: HTTP {status}")
    status, raw = http("POST", f"https://api.github.com/repos/{REPO}/actions/workflows/deploy.yml/dispatches",
                       {**headers, "Content-Type": "application/json"},
                       json.dumps({"ref": "main"}).encode())
    if status != 204:
        raise StatementError(f"could not start the site build: HTTP {status}")
    return True


BACKFILL_KEY = "backfill_transactions"  # transactions from the 2021-2026 bank history and the Jun/Jul card statements


def backfill(token, files):
    """One-time read of the history files. Only runs when the workflow is started with backfill on.
    Nothing is saved unless every file parses and its totals match."""
    jobs = []
    for f in files:
        if f["name"].startswith("Emailing"):
            jobs.append(("mtb_history", f))
        elif "JUN2026" in f["name"] or "JUL2026" in f["name"]:
            jobs.append(("ebl", f))
    if not jobs:
        raise StatementError("backfill found no history or Jun/Jul card files in the folder")
    out = []
    for kind, f in jobs:
        _, text = read_statement(download(token, f["id"]))
        if text is None:
            raise StatementError(f"backfill could not open {f['name']}")
        parsed = parse_mtb_history(text) if kind == "mtb_history" else parse_ebl(text)
        out.extend(build_transactions([parsed], "0000-00"))
    kv_put(BACKFILL_KEY, out)
    print(f"Backfill saved {len(out)} transactions from {len(jobs)} files")
    return out


def merge_transactions(*lists):
    seen, out = set(), []
    for lst in lists:
        for t in lst:
            key = (t["d"], t["t"], t["a"], t["s"], t["k"])
            if key not in seen:
                seen.add(key)
                out.append(t)
    out.sort(key=lambda x: x["d"], reverse=True)
    return out


def sync():
    state = kv_get_json(STATE_KEY, {})
    token = google_token()
    errors = []
    files = list_pdfs(token)
    if os.environ.get("BACKFILL") == "1":
        backfill(token, files)
    for f in files:
        if f["id"] in IGNORED_FILE_IDS:
            continue
        prev = state.get(f["id"])
        # Files that already parsed are kept; files that failed are retried every run.
        if prev and prev.get("modifiedTime") == f["modifiedTime"] and "rows" in prev:
            continue
        text = None
        try:
            kind, text = read_statement(download(token, f["id"]))
            if kind is None:
                raise StatementError("PDF did not open with either password, or is not a known statement")
            parsed = parse_mtb(text) if kind == "mtb" else parse_ebl(text)
            state[f["id"]] = {"name": f["name"], "modifiedTime": f["modifiedTime"],
                              "kind": kind, "rows": parsed["rows"]}
        except StatementError as e:
            errors.append(f"{f['name']}: {e}")
            state[f["id"]] = {"name": f["name"], "modifiedTime": f["modifiedTime"], "error": str(e)}
            if text:  # kept temporarily so the parser can be fixed; removed once the file parses
                kv_put(f"debug:{f['id']}", text)
    # Drop statements that were deleted from the folder.
    current = {f["id"] for f in files}
    for fid in list(state):
        if fid not in current:
            del state[fid]
    kv_put(STATE_KEY, state)

    # The same statement can be in the folder twice; count each one only once.
    seen, good = set(), []
    for s in state.values():
        if "rows" not in s:
            continue
        key = (s["kind"], json.dumps(s["rows"], sort_keys=True))
        if key in seen:
            continue
        seen.add(key)
        good.append(s)

    if errors or not good:
        kv_put(ERROR_KEY, {"errors": errors or ["no statements found in the folder"]})
        print("Not published:", errors or "no statements")
        return 1
    # Keep the base history and add only the months after its last month from the PDFs.
    base = kv_get_json(BASE_KEY, None)
    if base is None:
        raise StatementError("base history is missing from KV")
    base_series = base["monthly_series"]
    last_base = base_series[-1]["iso"]
    new_series = [m for m in build_monthly(good) if m["iso"] > last_base]
    if not new_series:
        kv_put(ERROR_KEY, {"errors": []})
        print("No new months after", last_base)
        return 0
    payload = payload_from_series(base_series + new_series)
    payload["transactions"] = merge_transactions(
        kv_get_json(BACKFILL_KEY, []), build_transactions(good, last_base))
    kv_put(DATA_KEY, payload)
    rebuilt = publish_to_repo(payload)
    kv_put(ERROR_KEY, {"errors": []})
    print(f"Published {len(payload['monthly_series'])} months from {len(good)} statements; "
          f"site rebuild {'started' if rebuilt else 'not needed'}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(sync())
    except StatementError as e:
        kv_put(ERROR_KEY, {"errors": [str(e)]})
        print("Failed:", e)
        sys.exit(1)
