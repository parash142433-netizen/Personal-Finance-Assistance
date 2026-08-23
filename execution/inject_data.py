"""
Reads data/finance_data.json and regenerates the MONTHLY_DATA and YEARLY_DATA
constants inside app.js.

Called automatically by GitHub Actions on every push (including pushes made by
Google Apps Script when the finance sheet is updated).

Usage:
    python execution/inject_data.py
"""

import json
import re
import sys
from pathlib import Path

BASE_DIR       = Path(__file__).parent.parent
DATA_PATH      = BASE_DIR / 'data' / 'finance_data.json'
APP_JS_PATH    = BASE_DIR / 'app.js'

# ── Load source data ────────────────────────────────────────────────────────────
if not DATA_PATH.exists():
    print(f'ERROR: {DATA_PATH} not found. Run analyze_expenditure.py --output first.', file=sys.stderr)
    sys.exit(1)

data = json.loads(DATA_PATH.read_text(encoding='utf-8'))
monthly_series = data['monthly_series']
yearly         = data['yearly']

# ── Build MONTHLY_DATA JS literal ──────────────────────────────────────────────
def js_row(r):
    return (
        f'  {{ label:"{r["label"]}", iso:"{r["iso"]}", '
        f'spent:{r["spent"]}, income:{r["income"]}, '
        f'salary:{r["salary"]}, accrualSalary:{r["accrualSalary"]}, '
        f'savings:{r["savings"]}, normalizedSavings:{r["normalizedSavings"]}, '
        f'balance:{r["balance"]}, tx:{r["tx"]} }}'
    )

monthly_lines = ',\n'.join(js_row(r) for r in monthly_series)
monthly_block = (
    '// ─────────────────────────────────────────────\n'
    '// DATA: auto-generated from data/finance_data.json\n'
    '// ─────────────────────────────────────────────\n'
    '// NOTE: salary=actual cash received; accrualSalary=bulk payments split evenly across the months they cover\n'
    '// savings=cash-flow net; normalizedSavings=accrual-based net (smoothed)\n'
    f'const MONTHLY_DATA = [\n{monthly_lines}\n];'
)

# ── Build YEARLY_DATA JS literal ───────────────────────────────────────────────
yearly_lines = []
for yr, v in sorted(yearly.items()):
    normalized = v.get('normalizedSavings', v['savings'])
    yearly_lines.append(
        f"  '{yr}': {{ income:{v['income']}, spent:{v['spent']}, "
        f"savings:{v['savings']}, normalizedSavings:{normalized}, tx:{v['tx']} }}"
    )
yearly_block = 'const YEARLY_DATA = {\n' + ',\n'.join(yearly_lines) + '\n};'

# ── Patch app.js ────────────────────────────────────────────────────────────────
source = APP_JS_PATH.read_text(encoding='utf-8')

# Replace everything from the DATA comment block through the end of YEARLY_DATA
# Matches the block starting at the DATA comment down to the closing }; of YEARLY_DATA
pattern = re.compile(
    r'// ─+\n// DATA:.*?(?=\n// ─+\n// UTILITIES)',
    re.DOTALL
)

replacement = monthly_block + '\n\n' + yearly_block + '\n\n'

new_source, n = pattern.subn(replacement, source)
if n == 0:
    print('ERROR: Could not locate MONTHLY_DATA block in app.js. Pattern not matched.', file=sys.stderr)
    sys.exit(1)

APP_JS_PATH.write_text(new_source, encoding='utf-8')
ov = data['overview']
print(
    f"Injected {len(monthly_series)} months of data into app.js  "
    f"(latest: {ov['latest_month']}, balance: {ov['latest_balance']:,.0f})",
    file=sys.stderr
)
