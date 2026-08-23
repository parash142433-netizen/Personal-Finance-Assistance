/**
 * Google Apps Script — Finance Sheet → GitHub Auto-Updater
 *
 * HOW TO INSTALL (one-time, ~10 minutes):
 *
 * 1. Open your Google Sheet
 * 2. Click Extensions → Apps Script
 * 3. Replace all code with this file's contents
 * 4. Set your configuration in the CONFIG object below
 * 5. Store your GitHub PAT securely:
 *    - In Apps Script editor: Run → Run function → storeToken
 *    - This saves your token in PropertiesService (never visible in code)
 * 6. Set up trigger:
 *    - Click Triggers (clock icon) → Add Trigger
 *    - Function: onSheetChange
 *    - Event source: From spreadsheet
 *    - Event type: On change
 *    - Also add a monthly time-based trigger as backup:
 *      Function: onSheetChange, Time-based, Month timer, Day 2, 08:00–09:00
 * 7. Authorize the script when prompted
 *
 * The script will automatically push updated finance_data.json to GitHub
 * whenever the sheet changes, triggering a full rebuild + deployment.
 */

// ── CONFIGURATION — edit these values ──────────────────────────────────────────
const CONFIG = {
  GITHUB_OWNER:  'YOUR_GITHUB_USERNAME',   // e.g. 'nasif-parash'
  GITHUB_REPO:   'YOUR_REPO_NAME',          // e.g. 'personal-finance-assistant'
  GITHUB_BRANCH: 'main',
  DATA_FILE_PATH: 'data/finance_data.json', // path in repo

  // Column mapping — match your Google Sheet column headers exactly
  COLS: {
    YEAR_MONTH:      'Year_Month',
    TOTAL_INCOME:    'Total_Income_BDT',
    TOTAL_SPENT:     'Total_Spent_BDT',
    SALARY:          'Salary_BDT',
    ACCRUAL_SALARY:  'Accrual_Salary_BDT',   // optional column
    NET_SAVINGS:     'Net_Savings_BDT',
    NORM_SAVINGS:    'Normalized_Savings_BDT', // optional column
    ENDING_BALANCE:  'Ending_Balance_BDT',
    TX_COUNT:        'Tx_Count',
  }
};

// ── TOKEN MANAGEMENT ────────────────────────────────────────────────────────────

/**
 * Run this function ONCE to store your GitHub PAT securely.
 * After running, delete the token string from this code.
 * Steps: In Apps Script editor → select 'storeToken' → Run
 */
function storeToken() {
  const token = 'ghp_PASTE_YOUR_TOKEN_HERE';  // ← paste PAT here, run once, then remove
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', token);
  Logger.log('Token stored successfully. Remove the token string from the code now.');
}

function getToken() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GitHub token not found. Run storeToken() first.');
  return token;
}

// ── MAIN TRIGGER ────────────────────────────────────────────────────────────────

/**
 * Triggered automatically when the sheet changes, or monthly.
 * Reads all finance data, computes aggregates, and pushes to GitHub.
 */
function onSheetChange() {
  try {
    const data = extractFinanceData();
    pushToGitHub(data);
    Logger.log('✅ Finance data pushed to GitHub successfully.');
  } catch (e) {
    Logger.log('❌ Error: ' + e.message);
    // Uncomment to get email alerts on failure:
    // MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Ledgr update failed', e.message);
  }
}

// ── DATA EXTRACTION ─────────────────────────────────────────────────────────────

function extractFinanceData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rawData = sheet.getDataRange().getValues();
  const headers = rawData[0];

  // Build rows as objects keyed by header name
  const rows = [];
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row[0]) continue; // skip empty rows
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx]; });
    rows.push(obj);
  }

  const C = CONFIG.COLS;

  // ── Compute aggregates ──────────────────────────────────────────────────────
  const totalMonths  = rows.length;
  const totalIncome  = sum(rows, C.TOTAL_INCOME);
  const totalSpent   = sum(rows, C.TOTAL_SPENT);
  const totalSalary  = sum(rows, C.SALARY);
  const totalSavings = sum(rows, C.NET_SAVINGS);
  const totalTx      = Math.round(sum(rows, C.TX_COUNT));
  const lastRow      = rows[rows.length - 1];
  const latestBalance = val(lastRow, C.ENDING_BALANCE);
  const latestMonth   = formatMonth(lastRow[C.YEAR_MONTH], 'long');

  const bestMonth    = rows.reduce((a, b) => val(a, C.NET_SAVINGS) >= val(b, C.NET_SAVINGS) ? a : b);
  const worstMonth   = rows.reduce((a, b) => val(a, C.NET_SAVINGS) <= val(b, C.NET_SAVINGS) ? a : b);
  const highSpend    = rows.reduce((a, b) => val(a, C.TOTAL_SPENT)  >= val(b, C.TOTAL_SPENT)  ? a : b);
  const highIncome   = rows.reduce((a, b) => val(a, C.TOTAL_INCOME) >= val(b, C.TOTAL_INCOME) ? a : b);
  const busiest      = rows.reduce((a, b) => val(a, C.TX_COUNT)     >= val(b, C.TX_COUNT)     ? a : b);

  // ── Year breakdown ──────────────────────────────────────────────────────────
  const byYear = {};
  rows.forEach(r => {
    const yr = String(getYear(r[C.YEAR_MONTH]));
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(r);
  });

  const yearly = {};
  Object.keys(byYear).sort().forEach(yr => {
    const rl = byYear[yr];
    yearly[yr] = {
      months:  rl.length,
      income:  round2(rl.reduce((s, r) => s + val(r, C.TOTAL_INCOME), 0)),
      spent:   round2(rl.reduce((s, r) => s + val(r, C.TOTAL_SPENT),  0)),
      savings: round2(rl.reduce((s, r) => s + val(r, C.NET_SAVINGS),  0)),
      tx:      Math.round(rl.reduce((s, r) => s + val(r, C.TX_COUNT), 0)),
    };
  });

  // ── Monthly series ──────────────────────────────────────────────────────────
  const monthlySeries = rows.map(r => ({
    label:             formatMonth(r[C.YEAR_MONTH], 'short'),
    iso:               formatISO(r[C.YEAR_MONTH]),
    spent:             round2(val(r, C.TOTAL_SPENT)),
    income:            round2(val(r, C.TOTAL_INCOME)),
    salary:            round2(val(r, C.SALARY)),
    accrualSalary:     round2(val(r, C.ACCRUAL_SALARY) || val(r, C.SALARY)),
    savings:           round2(val(r, C.NET_SAVINGS)),
    normalizedSavings: round2(val(r, C.NORM_SAVINGS) || val(r, C.NET_SAVINGS)),
    balance:           round2(val(r, C.ENDING_BALANCE)),
    tx:                Math.round(val(r, C.TX_COUNT)),
  }));

  return {
    overview: {
      total_months:        totalMonths,
      total_income:        round2(totalIncome),
      total_spent:         round2(totalSpent),
      total_salary:        round2(totalSalary),
      total_savings:       round2(totalSavings),
      total_transactions:  totalTx,
      latest_balance:      round2(latestBalance),
      latest_month:        latestMonth,
      avg_monthly_spend:   round2(totalSpent   / totalMonths),
      avg_monthly_income:  round2(totalIncome  / totalMonths),
      avg_monthly_savings: round2(totalSavings / totalMonths),
      positive_months:     rows.filter(r => val(r, C.NET_SAVINGS) > 0).length,
      negative_months:     rows.filter(r => val(r, C.NET_SAVINGS) < 0).length,
      savings_rate_pct:    round2(totalIncome ? (totalSavings / totalIncome * 100) : 0),
    },
    highlights: {
      best_month:            formatMonth(bestMonth[C.YEAR_MONTH], 'long'),
      best_month_savings:    round2(val(bestMonth,   C.NET_SAVINGS)),
      worst_month:           formatMonth(worstMonth[C.YEAR_MONTH], 'long'),
      worst_month_savings:   round2(val(worstMonth,  C.NET_SAVINGS)),
      highest_spend_month:   formatMonth(highSpend[C.YEAR_MONTH], 'long'),
      highest_spend_amount:  round2(val(highSpend,   C.TOTAL_SPENT)),
      highest_income_month:  formatMonth(highIncome[C.YEAR_MONTH], 'long'),
      highest_income_amount: round2(val(highIncome,  C.TOTAL_INCOME)),
      busiest_month:         formatMonth(busiest[C.YEAR_MONTH], 'long'),
      busiest_tx_count:      Math.round(val(busiest,  C.TX_COUNT)),
    },
    yearly,
    monthly_series: monthlySeries,
  };
}

// ── GITHUB PUSH ─────────────────────────────────────────────────────────────────

function pushToGitHub(data) {
  const token    = getToken();
  const jsonBody = JSON.stringify(data, null, 2);
  const b64      = Utilities.base64Encode(Utilities.newBlob(jsonBody).getBytes());

  const apiUrl = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${CONFIG.DATA_FILE_PATH}`;

  // Get current file SHA (required by GitHub API to update existing file)
  const getResp = UrlFetchApp.fetch(apiUrl + `?ref=${CONFIG.GITHUB_BRANCH}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
    muteHttpExceptions: true,
  });

  let sha = null;
  if (getResp.getResponseCode() === 200) {
    sha = JSON.parse(getResp.getContentText()).sha;
  }

  // Commit the updated file
  const body = {
    message: `chore: auto-update finance data (${new Date().toISOString().slice(0, 10)})`,
    content: b64,
    branch:  CONFIG.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  if (putResp.getResponseCode() !== 200 && putResp.getResponseCode() !== 201) {
    throw new Error(`GitHub API error ${putResp.getResponseCode()}: ${putResp.getContentText()}`);
  }
}

// ── HELPERS ─────────────────────────────────────────────────────────────────────

function val(row, key)    { return Number(row[key] || 0); }
function sum(rows, key)   { return rows.reduce((s, r) => s + val(r, key), 0); }
function round2(n)        { return Math.round(n * 100) / 100; }

function getYear(d) {
  if (d instanceof Date) return d.getFullYear();
  return new Date(d).getFullYear();
}

function formatMonth(d, style) {
  const date = d instanceof Date ? d : new Date(d);
  if (style === 'short') {
    // "Jan 2026"
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  // "January 2026"
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatISO(d) {
  const date = d instanceof Date ? d : new Date(d);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${m}`;
}
