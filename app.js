/* ══════════════════════════════════════════════
   LEDGR — app.js
   Data is auto-injected from data/finance_data.json
   by the CI pipeline (execution/inject_data.py).
   At runtime the app also tries to fetch fresh data
   from the Cloudflare Worker for instant updates.
══════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────
// LIVE DATA CONFIG
// ─────────────────────────────────────────────
// Set WORKER_URL to your Cloudflare Worker URL after deploying it.
// Leave as null to always use baked-in data (local / offline use).
const WORKER_URL = null; // e.g. 'https://ledgr-finance-proxy.your-name.workers.dev'


// ─────────────────────────────────────────────
// DATA: auto-generated from data/finance_data.json
// ─────────────────────────────────────────────
// NOTE: salary=actual cash received; accrualSalary=bulk payments split evenly across the months they cover
// savings=cash-flow net; normalizedSavings=accrual-based net (smoothed)
const MONTHLY_DATA = [
  { label:"Sep 2021", iso:"2021-09", spent:0, income:34317.14, salary:34315.0, accrualSalary:34315.0, savings:34317.14, normalizedSavings:34317.14, balance:34317.14, tx:2 },
  { label:"Oct 2021", iso:"2021-10", spent:3007.0, income:29168.64, salary:25096.0, accrualSalary:25096.0, savings:26161.64, normalizedSavings:26161.64, balance:60478.78, tx:6 },
  { label:"Nov 2021", iso:"2021-11", spent:56283.0, income:37030.86, salary:23963.0, accrualSalary:23963.0, savings:-19252.14, normalizedSavings:-19252.14, balance:41226.64, tx:15 },
  { label:"Dec 2021", iso:"2021-12", spent:19434.0, income:76083.94, salary:23988.0, accrualSalary:23988.0, savings:56649.94, normalizedSavings:56649.94, balance:97876.58, tx:11 },
  { label:"Jan 2022", iso:"2022-01", spent:51439.0, income:38063.0, salary:28063.0, accrualSalary:28063.0, savings:-13376.0, normalizedSavings:-13376.0, balance:84500.58, tx:15 },
  { label:"Feb 2022", iso:"2022-02", spent:2565.0, income:53303.29, salary:28103.0, accrualSalary:28103.0, savings:50738.29, normalizedSavings:50738.29, balance:135238.87, tx:13 },
  { label:"Mar 2022", iso:"2022-03", spent:42970.0, income:30244.56, salary:28033.0, accrualSalary:28033.0, savings:-12725.44, normalizedSavings:-12725.44, balance:122513.43, tx:13 },
  { label:"Apr 2022", iso:"2022-04", spent:13277.0, income:57290.5, salary:28073.0, accrualSalary:28073.0, savings:44013.5, normalizedSavings:44013.5, balance:166526.93, tx:10 },
  { label:"May 2022", iso:"2022-05", spent:5186.0, income:39419.36, salary:27898.0, accrualSalary:27898.0, savings:34233.36, normalizedSavings:34233.36, balance:200760.29, tx:8 },
  { label:"Jun 2022", iso:"2022-06", spent:63597.0, income:83427.88, salary:58093.0, accrualSalary:58093.0, savings:19830.88, normalizedSavings:19830.88, balance:220591.17, tx:12 },
  { label:"Jul 2022", iso:"2022-07", spent:18921.0, income:53092.48, salary:26678.0, accrualSalary:26678.0, savings:34171.48, normalizedSavings:34171.48, balance:254762.65, tx:11 },
  { label:"Aug 2022", iso:"2022-08", spent:307947.0, income:82152.94, salary:26843.0, accrualSalary:26843.0, savings:-225794.06, normalizedSavings:-225794.06, balance:28968.59, tx:15 },
  { label:"Sep 2022", iso:"2022-09", spent:13395.0, income:43057.04, salary:26793.0, accrualSalary:26793.0, savings:29662.04, normalizedSavings:29662.04, balance:58630.63, tx:10 },
  { label:"Oct 2022", iso:"2022-10", spent:27557.0, income:60440.56, salary:26628.0, accrualSalary:26628.0, savings:32883.56, normalizedSavings:32883.56, balance:91514.19, tx:12 },
  { label:"Nov 2022", iso:"2022-11", spent:10327.0, income:41793.59, salary:26748.0, accrualSalary:26748.0, savings:31466.59, normalizedSavings:31466.59, balance:122980.78, tx:9 },
  { label:"Dec 2022", iso:"2022-12", spent:28568.0, income:115883.15, salary:43363.0, accrualSalary:43363.0, savings:87315.15, normalizedSavings:87315.15, balance:210295.93, tx:14 },
  { label:"Jan 2023", iso:"2023-01", spent:35082.0, income:29190.28, salary:0, accrualSalary:0, savings:-5891.72, normalizedSavings:-5891.72, balance:204404.21, tx:14 },
  { label:"Feb 2023", iso:"2023-02", spent:24266.0, income:86138.18, salary:64790.0, accrualSalary:64790.0, savings:61872.18, normalizedSavings:61872.18, balance:266276.39, tx:16 },
  { label:"Mar 2023", iso:"2023-03", spent:61740.0, income:46900.0, salary:0, accrualSalary:0, savings:-14840.0, normalizedSavings:-14840.0, balance:251436.39, tx:12 },
  { label:"Apr 2023", iso:"2023-04", spent:74611.0, income:98250.0, salary:84750.0, accrualSalary:84750.0, savings:23639.0, normalizedSavings:23639.0, balance:275075.39, tx:18 },
  { label:"May 2023", iso:"2023-05", spent:27775.0, income:46901.92, salary:32150.0, accrualSalary:32150.0, savings:19126.92, normalizedSavings:19126.92, balance:294202.31, tx:12 },
  { label:"Jun 2023", iso:"2023-06", spent:8878.0, income:61291.39, salary:32236.0, accrualSalary:32236.0, savings:52413.39, normalizedSavings:52413.39, balance:346615.7, tx:11 },
  { label:"Jul 2023", iso:"2023-07", spent:90466.0, income:48907.61, salary:30837.0, accrualSalary:30837.0, savings:-41558.39, normalizedSavings:-41558.39, balance:305057.31, tx:17 },
  { label:"Aug 2023", iso:"2023-08", spent:31583.0, income:40764.04, salary:32147.0, accrualSalary:32147.0, savings:9181.04, normalizedSavings:9181.04, balance:314238.35, tx:11 },
  { label:"Sep 2023", iso:"2023-09", spent:27688.0, income:47516.39, salary:31923.0, accrualSalary:31923.0, savings:19828.39, normalizedSavings:19828.39, balance:334066.74, tx:15 },
  { label:"Oct 2023", iso:"2023-10", spent:65085.0, income:62763.14, salary:32195.0, accrualSalary:32195.0, savings:-2321.86, normalizedSavings:-2321.86, balance:331744.88, tx:15 },
  { label:"Nov 2023", iso:"2023-11", spent:12020.0, income:52871.74, salary:32123.0, accrualSalary:32123.0, savings:40851.74, normalizedSavings:40851.74, balance:372596.62, tx:10 },
  { label:"Dec 2023", iso:"2023-12", spent:47605.0, income:66148.0, salary:0, accrualSalary:0, savings:18543.0, normalizedSavings:18543.0, balance:391139.62, tx:15 },
  { label:"Jan 2024", iso:"2024-01", spent:451940.0, income:110682.0, salary:92952.0, accrualSalary:92952.0, savings:-341258.0, normalizedSavings:-341258.0, balance:49881.62, tx:24 },
  { label:"Feb 2024", iso:"2024-02", spent:7143.0, income:48710.16, salary:41164.0, accrualSalary:41164.0, savings:41567.16, normalizedSavings:41567.16, balance:91448.78, tx:11 },
  { label:"Mar 2024", iso:"2024-03", spent:13703.0, income:72840.67, salary:67555.0, accrualSalary:67555.0, savings:59137.67, normalizedSavings:59137.67, balance:150586.45, tx:13 },
  { label:"Apr 2024", iso:"2024-04", spent:41811.0, income:51232.0, salary:41185.0, accrualSalary:41185.0, savings:9421.0, normalizedSavings:9421.0, balance:160007.45, tx:13 },
  { label:"May 2024", iso:"2024-05", spent:56764.0, income:14457.53, salary:0, accrualSalary:0, savings:-42306.47, normalizedSavings:-42306.47, balance:117700.98, tx:17 },
  { label:"Jun 2024", iso:"2024-06", spent:55233.0, income:148930.1, salary:108836.0, accrualSalary:108836.0, savings:93697.1, normalizedSavings:93697.1, balance:211398.08, tx:21 },
  { label:"Jul 2024", iso:"2024-07", spent:124379.0, income:15936.0, salary:0, accrualSalary:0, savings:-108443.0, normalizedSavings:-108443.0, balance:102955.08, tx:16 },
  { label:"Aug 2024", iso:"2024-08", spent:40781.0, income:58499.0, salary:41807.0, accrualSalary:41807.0, savings:17718.0, normalizedSavings:17718.0, balance:120673.08, tx:16 },
  { label:"Sep 2024", iso:"2024-09", spent:79848.0, income:97543.0, salary:82903.0, accrualSalary:82903.0, savings:17695.0, normalizedSavings:17695.0, balance:138368.08, tx:18 },
  { label:"Oct 2024", iso:"2024-10", spent:51643.0, income:82056.0, salary:41310.0, accrualSalary:41310.0, savings:30413.0, normalizedSavings:30413.0, balance:168781.08, tx:19 },
  { label:"Nov 2024", iso:"2024-11", spent:34880.0, income:17082.0, salary:0, accrualSalary:0, savings:-17798.0, normalizedSavings:-17798.0, balance:150983.08, tx:14 },
  { label:"Dec 2024", iso:"2024-12", spent:75414.0, income:171208.07, salary:109031.0, accrualSalary:109031.0, savings:95794.07, normalizedSavings:95794.07, balance:246777.15, tx:22 },
  { label:"Jan 2025", iso:"2025-01", spent:34171.0, income:19414.03, salary:0, accrualSalary:0, savings:-14756.97, normalizedSavings:-14756.97, balance:232020.18, tx:17 },
  { label:"Feb 2025", iso:"2025-02", spent:10481.0, income:113731.86, salary:93840.0, accrualSalary:93840.0, savings:103250.86, normalizedSavings:103250.86, balance:335271.04, tx:15 },
  { label:"Mar 2025", iso:"2025-03", spent:47959.0, income:85229.41, salary:46768.0, accrualSalary:46768.0, savings:37270.41, normalizedSavings:37270.41, balance:372541.45, tx:17 },
  { label:"Apr 2025", iso:"2025-04", spent:347688.0, income:102281.0, salary:46895.0, accrualSalary:46895.0, savings:-245407.0, normalizedSavings:-245407.0, balance:127134.45, tx:22 },
  { label:"May 2025", iso:"2025-05", spent:74350.0, income:61952.0, salary:0, accrualSalary:0, savings:-12398.0, normalizedSavings:-12398.0, balance:114736.45, tx:25 },
  { label:"Jun 2025", iso:"2025-06", spent:26343.0, income:106317.61, salary:92818.0, accrualSalary:92818.0, savings:79974.61, normalizedSavings:79974.61, balance:194711.06, tx:19 },
  { label:"Jul 2025", iso:"2025-07", spent:69014.0, income:69845.37, salary:46635.0, accrualSalary:46635.0, savings:831.37, normalizedSavings:831.37, balance:195542.43, tx:23 },
  { label:"Aug 2025", iso:"2025-08", spent:28716.0, income:332462.0, salary:0, accrualSalary:0, savings:303746.0, normalizedSavings:303746.0, balance:499288.43, tx:13 },
  { label:"Sep 2025", iso:"2025-09", spent:88285.0, income:138471.0, salary:92921.0, accrualSalary:92921.0, savings:50186.0, normalizedSavings:50186.0, balance:549474.43, tx:31 },
  { label:"Oct 2025", iso:"2025-10", spent:459837.0, income:70996.37, salary:46841.0, accrualSalary:46841.0, savings:-388840.63, normalizedSavings:-388840.63, balance:160633.8, tx:26 },
  { label:"Nov 2025", iso:"2025-11", spent:58299.45, income:59293.0, salary:46823.0, accrualSalary:46823.0, savings:993.55, normalizedSavings:993.55, balance:161627.35, tx:36 },
  { label:"Dec 2025", iso:"2025-12", spent:21145.0, income:267590.62, salary:76443.0, accrualSalary:76443.0, savings:246445.62, normalizedSavings:246445.62, balance:408072.97, tx:26 },
  { label:"Jan 2026", iso:"2026-01", spent:176465.0, income:31668.87, salary:0, accrualSalary:0, savings:-144796.13, normalizedSavings:-144796.13, balance:263276.84, tx:20 },
  { label:"Feb 2026", iso:"2026-02", spent:50786.0, income:63436.0, salary:60936.0, accrualSalary:60936.0, savings:12650.0, normalizedSavings:12650.0, balance:275926.84, tx:24 },
  { label:"Mar 2026", iso:"2026-03", spent:56346.0, income:167818.0, salary:156168.0, accrualSalary:156168.0, savings:111472.0, normalizedSavings:111472.0, balance:387398.84, tx:25 },
  { label:"Apr 2026", iso:"2026-04", spent:196285.53, income:201468.87, salary:60900.0, accrualSalary:60900.0, savings:5183.34, normalizedSavings:5183.34, balance:392582.18, tx:48 },
  { label:"May 2026", iso:"2026-05", spent:391577.59, income:87720.0, salary:0, accrualSalary:0, savings:-303857.59, normalizedSavings:-303857.59, balance:88724.59, tx:28 },
  { label:"Jun 2026", iso:"2026-06", spent:47674.12, income:134724.0, salary:121374.0, accrualSalary:121374.0, savings:87049.88, normalizedSavings:87049.88, balance:175774.47, tx:19 },
  { label:"Jul 2026", iso:"2026-07", spent:25600.0, income:46240.37, salary:0, accrualSalary:0, savings:20640.37, normalizedSavings:20640.37, balance:196414.84, tx:10 }
];

const YEARLY_DATA = {
  '2021': { income:176600.58, spent:78724.0, savings:97876.58, normalizedSavings:97876.58, tx:34 },
  '2022': { income:698168.35, spent:585749.0, savings:112419.35, normalizedSavings:112419.35, tx:142 },
  '2023': { income:687642.69, spent:506799.0, savings:180843.69, normalizedSavings:180843.69, tx:166 },
  '2024': { income:889176.53, spent:1033539.0, savings:-144362.47, normalizedSavings:-144362.47, tx:204 },
  '2025': { income:1427584.27, spent:1266288.45, savings:161295.82, normalizedSavings:161295.82, tx:270 },
  '2026': { income:733076.11, spent:944734.24, savings:-211658.13, normalizedSavings:-211658.13, tx:174 }
};


// ─────────────────────────────────────────────
// LIVE DATA LOADER
// ─────────────────────────────────────────────
/**
 * Fetch fresh data from Cloudflare Worker and overwrite baked-in constants.
 * Silently falls back to baked-in data if WORKER_URL is null, offline, or fails.
 * Called once after DOMContentLoaded so the initial render uses baked-in data
 * (instant) and the live refresh happens in the background.
 */
async function tryLoadLiveData() {
  if (!WORKER_URL) return;
  try {
    const resp = await fetch(WORKER_URL, { cache: 'no-cache' });
    if (!resp.ok) return;
    const json = await resp.json();
    if (!json.monthly_series || !json.yearly) return;

    // Overwrite globals in-place
    MONTHLY_DATA.length = 0;
    json.monthly_series.forEach(r => MONTHLY_DATA.push(r));
    Object.keys(YEARLY_DATA).forEach(k => delete YEARLY_DATA[k]);
    Object.assign(YEARLY_DATA, json.yearly);

    // Re-render with live data
    buildTrendChart(activeRange);
    buildSavingsRateChart();
    buildBalanceChart();
    buildNetSavingsChart();
    buildYearlyChart();
    buildTxChart();
    buildYearlySavingsBar();
    buildYearlyTable();
    populateSummary();
    console.info('[Ledgr] Live data refreshed from Worker.');
  } catch (_) { /* offline or Worker unavailable — keep baked-in data */ }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
const fmt = (n, compact=false) => {
  if (compact && Math.abs(n) >= 100000) return '৳' + (n/100000).toFixed(1) + 'L';
  if (compact && Math.abs(n) >= 1000)   return '৳' + (n/1000).toFixed(1) + 'K';
  return '৳' + Math.round(n).toLocaleString('en-IN');
};

function el(id) { return document.getElementById(id); }

function setCurrentDate() {
  const d = new Date();
  el('currentDate').textContent = d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
const PAGES = ['dashboard','analytics','calendar','budget','savings','debts','transactions','scheduled','summary','settings'];

function navigate(page) {
  PAGES.forEach(p => {
    const pg  = el(`page-${p}`);
    const nav = el(`nav-${p}`);
    if (pg)  pg.classList.toggle('active', p === page);
    if (nav) nav.classList.toggle('active', p === page);
  });
  el('topbarTitle').textContent = {
    dashboard:'Dashboard', analytics:'Analytics', calendar:'Calendar View',
    budget:'Budget Planner', savings:'Savings Goals', debts:'Debts & Loans',
    transactions:'Transactions', scheduled:'Scheduled', summary:'Personal Summary',
    settings:'Settings'
  }[page] || page;
  // Close sidebar & backdrop on mobile navigation
  closeSidebar();
}

function closeSidebar() {
  const sidebar = el('sidebar');
  const backdrop = el('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
}

function toggleSidebar() {
  const sidebar = el('sidebar');
  const backdrop = el('sidebarBackdrop');
  if (sidebar) {
    const isOpen = sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('open', isOpen);
  }
}

function initNav() {
  PAGES.forEach(p => {
    const nav = el(`nav-${p}`);
    if (nav) nav.addEventListener('click', () => navigate(p));
  });
  el('hamburger')?.addEventListener('click', toggleSidebar);
  el('sidebarCloseBtn')?.addEventListener('click', closeSidebar);
  el('sidebarBackdrop')?.addEventListener('click', closeSidebar);
}

// ─────────────────────────────────────────────
// CHART HELPERS
// ─────────────────────────────────────────────
Chart.defaults.color = '#8b8fa8';
Chart.defaults.font.family = "'Inter', sans-serif";

const COLORS = {
  income:  '#10b981',
  spent:   '#ef4444',
  savings: '#6366f1',
  balance: '#06b6d4',
  gold:    '#f59e0b',
};

function lineDataset(label, data, color, fill=false) {
  return {
    label, data,
    borderColor: color,
    backgroundColor: fill ? color + '18' : 'transparent',
    fill,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 5,
    tension: 0.4,
  };
}

function barDataset(label, data, color) {
  return { label, data, backgroundColor: color + 'cc', borderRadius: 4, borderSkipped: false };
}

// ─────────────────────────────────────────────
// RANGE FILTER
// ─────────────────────────────────────────────
let trendChart = null;
let activeRange = 'all';

function getFilteredData(range) {
  const n = { '6m':6, '1y':12, '2y':24 }[range];
  return n ? MONTHLY_DATA.slice(-n) : MONTHLY_DATA;
}

function buildTrendChart(range='all') {
  const data = getFilteredData(range);
  const labels = data.map(d => d.label);

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(el('trendChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        lineDataset('Income',  data.map(d => d.income), COLORS.income,  true),
        lineDataset('Spending',data.map(d => d.spent),  COLORS.spent,   true),
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: { legend: { position:'top' }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } },
      scales: {
        x: { grid: { color:'rgba(255,255,255,.04)' }, ticks: { maxTicksLimit: 12, maxRotation: 45 } },
        y: { grid: { color:'rgba(255,255,255,.04)' }, ticks: { callback: v => fmt(v, true) } }
      }
    }
  });
}

// ─────────────────────────────────────────────
// DASHBOARD CHARTS
// ─────────────────────────────────────────────
function buildSavingsRateChart() {
  const positive = MONTHLY_DATA.filter(d => d.savings >= 0).length;
  const negative = MONTHLY_DATA.length - positive;
  new Chart(el('savingsRateChart'), {
    type: 'doughnut',
    data: {
      labels: ['Positive months', 'Deficit months'],
      datasets: [{ data:[positive, negative], backgroundColor:['#10b981cc','#ef4444cc'], borderWidth:0, hoverOffset:8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position:'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} months` } }
      },
      cutout: '65%'
    }
  });
}

function buildBalanceChart() {
  const labels = MONTHLY_DATA.map(d => d.label);
  new Chart(el('balanceChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [lineDataset('Balance', MONTHLY_DATA.map(d => d.balance), COLORS.balance, true)]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display:false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } },
      scales: {
        x: { grid: { display:false }, ticks: { maxTicksLimit: 10, maxRotation: 45 } },
        y: { grid: { color:'rgba(255,255,255,.04)' }, ticks: { callback: v => fmt(v, true) } }
      }
    }
  });
}

function buildNetSavingsChart() {
  const labels = MONTHLY_DATA.map(d => d.label);
  const savings = MONTHLY_DATA.map(d => d.savings);
  new Chart(el('netSavingsChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:'Net Savings',
        data: savings,
        backgroundColor: savings.map(v => v >= 0 ? '#10b98188' : '#ef444488'),
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{display:false}, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } },
      scales: {
        x: { grid:{display:false}, ticks:{maxTicksLimit:10, maxRotation:45} },
        y: { grid:{color:'rgba(255,255,255,.04)'}, ticks:{callback: v => fmt(v,true)} }
      }
    }
  });
}

// ─────────────────────────────────────────────
// ANALYTICS CHARTS
// ─────────────────────────────────────────────
function buildYearlyChart() {
  const years = Object.keys(YEARLY_DATA);
  new Chart(el('yearlyChart'), {
    type:'bar',
    data:{
      labels: years,
      datasets:[
        barDataset('Income',  years.map(y=>YEARLY_DATA[y].income),  COLORS.income),
        barDataset('Spending',years.map(y=>YEARLY_DATA[y].spent),   COLORS.spent),
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:'top'}, tooltip:{ callbacks:{ label: ctx => fmt(ctx.raw) } } },
      scales:{
        x:{grid:{color:'rgba(255,255,255,.04)'}},
        y:{grid:{color:'rgba(255,255,255,.04)'}, ticks:{callback: v=>fmt(v,true)}}
      }
    }
  });
}

function buildTxChart() {
  const labels = MONTHLY_DATA.map(d => d.label);
  new Chart(el('txChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[barDataset('Transactions', MONTHLY_DATA.map(d=>d.tx), COLORS.savings)]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{display:false}, ticks:{maxTicksLimit:10, maxRotation:45}},
        y:{grid:{color:'rgba(255,255,255,.04)'}}
      }
    }
  });
}

function buildYearlySavingsBar() {
  const years = Object.keys(YEARLY_DATA);
  const savings = years.map(y=>YEARLY_DATA[y].savings);
  new Chart(el('yearlySavingsBar'), {
    type:'bar',
    data:{
      labels:years,
      datasets:[{
        label:'Net Savings',
        data:savings,
        backgroundColor:savings.map(v=>v>=0?'#10b98188':'#ef444488'),
        borderRadius:6
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>fmt(ctx.raw)}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,.04)'}},
        y:{grid:{color:'rgba(255,255,255,.04)'}, ticks:{callback:v=>fmt(v,true)}}
      }
    }
  });
}

function buildYearlyTable() {
  const tbody = el('yearlyTableBody');
  Object.entries(YEARLY_DATA).forEach(([yr, d]) => {
    const rate = d.income ? ((d.savings/d.income)*100).toFixed(1) : 'N/A';
    const cls  = d.savings >= 0 ? 'green' : 'red';
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${yr}</td>
        <td>${Math.ceil(MONTHLY_DATA.filter(m=>m.iso.startsWith(yr)).length)}</td>
        <td>${fmt(d.income)}</td>
        <td>${fmt(d.spent)}</td>
        <td class="${cls}">${d.savings>=0?'+':''}${fmt(d.savings)}</td>
        <td>${d.tx}</td>
        <td class="${cls}">${rate}%</td>
      </tr>`);
  });
}

// ─────────────────────────────────────────────
// CALENDAR VIEW
// ─────────────────────────────────────────────
let calDate = new Date(2026, 6); // July 2026 (last month with data)

function renderCalendar() {
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const key   = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthData = MONTHLY_DATA.find(d => d.iso === key);

  el('calMonthLabel').textContent = calDate.toLocaleDateString('en-US', { month:'long', year:'numeric' });

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = new Date();

  const grid = el('calendarGrid');
  grid.innerHTML = '';

  // blank cells before 1st
  for (let i = 0; i < firstDay; i++) {
    grid.insertAdjacentHTML('beforeend','<div class="cal-cell empty"></div>');
  }

  // Simulate daily spend distribution (uniform if data exists)
  const dailySpend = monthData ? monthData.spent / daysInMonth : 0;
  const maxSpend   = monthData ? monthData.spent : 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===d;
    // Simulate some variation
    const variationFactor = [0.4,0.2,1.2,0.8,0.6,1.5,0.3][(d+month)%7];
    const spend = dailySpend * variationFactor;
    const heat  = monthData ? Math.min(4, Math.floor((spend / (maxSpend * variationFactor / daysInMonth)) * 4)) : 0;
    const bg    = ['var(--bg-card2)','rgba(99,102,241,.25)','rgba(99,102,241,.45)','rgba(99,102,241,.65)','rgba(99,102,241,.9)'][heat];
    const textColor = heat >= 3 ? '#fff' : 'var(--text-primary)';
    grid.insertAdjacentHTML('beforeend', `
      <div class="cal-cell h${heat}${isToday?' today':''}"
           style="background:${bg};color:${textColor}"
           title="${d} ${calDate.toLocaleDateString('en-US',{month:'short'})}: ~${fmt(spend,true)}">${d}</div>`);
  }

  // Summary
  const sum = el('calMonthSummary');
  if (monthData) {
    sum.innerHTML = `
      <div><span style="color:var(--text-muted)">Income</span><br><strong style="color:var(--green)">${fmt(monthData.income)}</strong></div>
      <div><span style="color:var(--text-muted)">Spent</span><br><strong style="color:var(--red)">${fmt(monthData.spent)}</strong></div>
      <div><span style="color:var(--text-muted)">Net Savings</span><br><strong style="color:${monthData.savings>=0?'var(--green)':'var(--red)'}">${fmt(monthData.savings)}</strong></div>
      <div><span style="color:var(--text-muted)">Transactions</span><br><strong>${monthData.tx}</strong></div>
      <div><span style="color:var(--text-muted)">Balance</span><br><strong style="color:var(--teal)">${fmt(monthData.balance)}</strong></div>`;
  } else {
    sum.innerHTML = `<p style="color:var(--text-muted)">No data for this month in the dataset.</p>`;
  }
}

function initCalendar() {
  el('calPrev').addEventListener('click', () => {
    calDate = new Date(calDate.getFullYear(), calDate.getMonth()-1);
    renderCalendar();
  });
  el('calNext').addEventListener('click', () => {
    calDate = new Date(calDate.getFullYear(), calDate.getMonth()+1);
    renderCalendar();
  });
  renderCalendar();
}

// ─────────────────────────────────────────────
// TRANSACTIONS TABLE
// ─────────────────────────────────────────────
// accrualMode: true = show normalizedSavings (smoothed), false = show raw cash savings
let accrualMode = false;

function renderTxTable(search='', filter='all', year='all') {
  let data = [...MONTHLY_DATA].reverse();
  if (search) data = data.filter(d => d.label.toLowerCase().includes(search.toLowerCase()));
  // Filter by whichever savings field is active
  if (filter === 'positive') data = data.filter(d => (accrualMode ? d.normalizedSavings : d.savings) >= 0);
  if (filter === 'negative') data = data.filter(d => (accrualMode ? d.normalizedSavings : d.savings) < 0);
  if (year !== 'all') data = data.filter(d => d.iso.startsWith(year));

  const tbody = el('txTableBody');
  tbody.innerHTML = data.map(d => {
    const isDeferred = d.salary === 0 && d.accrualSalary === 0 ? false :
                       (d.salary === 0 || Math.abs(d.accrualSalary - d.salary) > 1000);
    const savingsVal = accrualMode ? d.normalizedSavings : d.savings;
    const salaryVal  = accrualMode ? d.accrualSalary     : d.salary;
    const deferTag   = isDeferred && accrualMode
      ? `<span class="badge badge-blue" title="Salary smoothed: was credited as bulk payment">~Accrual</span> `
      : (isDeferred && !accrualMode)
      ? `<span class="badge badge-orange" title="Salary credited in a different month (bulk payment)">Deferred</span> `
      : '';
    return `
    <tr class="${isDeferred ? 'row-deferred' : ''}">
      <td><strong>${d.label}</strong></td>
      <td class="green">${fmt(d.income)}</td>
      <td>${salaryVal ? fmt(salaryVal) : '<span style="color:var(--text-muted)">—</span>'} ${deferTag}</td>
      <td class="red">${fmt(d.spent)}</td>
      <td class="${savingsVal>=0?'green':'red'}">${savingsVal>=0?'+':''}${fmt(savingsVal)}</td>
      <td>${d.tx}</td>
      <td style="color:var(--teal)">${fmt(d.balance)}</td>
      <td><span class="badge ${savingsVal>=0?'badge-green':'badge-red'}">${savingsVal>=0?'Saved':'Deficit'}</span></td>
    </tr>`;
  }).join('');
}

function initTransactions() {
  renderTxTable();
  const search = el('txSearch'), filter = el('txFilter'), year = el('txYear');
  const update = () => renderTxTable(search.value, filter.value, year.value);
  search.addEventListener('input', update);
  filter.addEventListener('change', update);
  year.addEventListener('change', update);

  // Accrual toggle button
  const toggleBtn = el('accrualToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      accrualMode = !accrualMode;
      toggleBtn.textContent = accrualMode ? '📊 Cash Flow View' : '📈 Accrual View';
      toggleBtn.classList.toggle('active', accrualMode);
      update();
    });
  }
}

// ─────────────────────────────────────────────
// LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────
function lsGet(key, def=[]) {
  try { return JSON.parse(localStorage.getItem('ledgr_'+key)) ?? def; } catch { return def; }
}
function lsSet(key, val) { localStorage.setItem('ledgr_'+key, JSON.stringify(val)); }

// ─────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────
let budgets = lsGet('budgets', [
  { cat:'Housing', limit:30000, spent:20000, icon:'🏠' },
  { cat:'Food',    limit:15000, spent:12500, icon:'🍜' },
  { cat:'Transport',limit:5000, spent:3200,  icon:'🚗' },
  { cat:'Shopping', limit:10000,spent:8100,  icon:'🛍️' },
]);

function renderBudgets() {
  el('budgetList').innerHTML = budgets.map((b, i) => {
    const pct  = Math.min(100, (b.spent/b.limit)*100);
    const over = b.spent > b.limit;
    return `
      <div class="budget-item">
        <div class="budget-item-header">
          <div class="budget-name">${b.icon} ${b.cat}</div>
          <div class="budget-amounts">${fmt(b.spent)} / ${fmt(b.limit)} · ${pct.toFixed(0)}%</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${over?'over':''}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function initBudget() {
  renderBudgets();
  el('addBudgetBtn').addEventListener('click', () => el('budgetModal').classList.remove('hidden'));
  el('cancelBudget').addEventListener('click', () => el('budgetModal').classList.add('hidden'));
  el('saveBudget').addEventListener('click', () => {
    const cat   = el('budgetCatInput').value.trim();
    const limit = parseFloat(el('budgetLimitInput').value) || 0;
    const icon  = el('budgetIconInput').value.trim() || '💳';
    if (cat && limit) {
      budgets.push({ cat, limit, spent: 0, icon });
      lsSet('budgets', budgets);
      renderBudgets();
      el('budgetModal').classList.add('hidden');
      el('budgetCatInput').value = el('budgetLimitInput').value = el('budgetIconInput').value = '';
    }
  });
}

// ─────────────────────────────────────────────
// SAVINGS GOALS
// ─────────────────────────────────────────────
let goals = lsGet('goals', [
  { name:'Emergency Fund', target:200000, current:50000,  deadline:'2026-12-31', emoji:'🛡️' },
  { name:'Laptop Upgrade',  target:80000,  current:30000,  deadline:'2026-11-01', emoji:'💻' },
  { name:'Vacation',        target:150000, current:20000,  deadline:'2027-03-01', emoji:'✈️' },
]);

function renderGoals() {
  el('goalsGrid').innerHTML = goals.map((g, i) => {
    const pct = Math.min(100, (g.current/g.target)*100);
    return `
      <div class="goal-card">
        <div class="goal-icon">${g.emoji||'🎯'}</div>
        <div class="goal-name">${g.name}</div>
        <div class="goal-amounts">${fmt(g.current)} saved of ${fmt(g.target)}</div>
        <div class="goal-pct">${pct.toFixed(0)}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        ${g.deadline ? `<div class="goal-deadline">🗓️ Target: ${new Date(g.deadline).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</div>` : ''}
      </div>`;
  }).join('');
}

function initSavings() {
  renderGoals();
  el('addGoalBtn').addEventListener('click', () => el('goalModal').classList.remove('hidden'));
  el('cancelGoal').addEventListener('click', () => el('goalModal').classList.add('hidden'));
  el('saveGoal').addEventListener('click', () => {
    const name     = el('goalNameInput').value.trim();
    const target   = parseFloat(el('goalTargetInput').value) || 0;
    const current  = parseFloat(el('goalCurrentInput').value) || 0;
    const deadline = el('goalDeadlineInput').value;
    if (name && target) {
      goals.push({ name, target, current, deadline, emoji:'🎯' });
      lsSet('goals', goals);
      renderGoals();
      el('goalModal').classList.add('hidden');
      ['goalNameInput','goalTargetInput','goalCurrentInput','goalDeadlineInput'].forEach(id => el(id).value='');
    }
  });
}

// ─────────────────────────────────────────────
// DEBTS
// ─────────────────────────────────────────────
let debts = lsGet('debts', [
  { type:'owe',  person:'Credit Card', amount:15000, due:'2026-09-01', note:'Monthly payment' },
  { type:'owed', person:'Rahim Bhai',  amount:5000,  due:'2026-10-15', note:'Borrowed for event' },
]);
let debtTab = 'owe';

function renderDebts() {
  el('debtList').innerHTML = debts
    .filter(d => d.type === debtTab)
    .map((d, i) => `
      <div class="debt-item">
        <div>
          <div class="debt-person">${d.person}</div>
          <div class="debt-meta">${d.note} · Due: ${d.due ? new Date(d.due).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'N/A'}</div>
        </div>
        <div class="debt-amount ${d.type==='owe'?'red':'green'}">${fmt(d.amount)}</div>
      </div>`).join('') || `<p style="color:var(--text-muted);padding:1rem">No entries yet.</p>`;
}

function initDebts() {
  renderDebts();
  el('debtList');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      debtTab = btn.dataset.tab;
      renderDebts();
    });
  });
  el('addDebtBtn').addEventListener('click', () => el('debtModal').classList.remove('hidden'));
  el('cancelDebt').addEventListener('click', () => el('debtModal').classList.add('hidden'));
  el('saveDebt').addEventListener('click', () => {
    const person = el('debtPersonInput').value.trim();
    const amount = parseFloat(el('debtAmountInput').value) || 0;
    const due    = el('debtDueInput').value;
    const note   = el('debtNoteInput').value.trim();
    if (person && amount) {
      debts.push({ type:debtTab, person, amount, due, note });
      lsSet('debts', debts);
      renderDebts();
      el('debtModal').classList.add('hidden');
      ['debtPersonInput','debtAmountInput','debtDueInput','debtNoteInput'].forEach(id => el(id).value='');
    }
  });
}

// ─────────────────────────────────────────────
// SCHEDULED TRANSACTIONS
// ─────────────────────────────────────────────
let scheduled = lsGet('scheduled', [
  { name:'Salary',     amount:60000, type:'income',  freq:'monthly', due:'2026-09-01' },
  { name:'Rent',       amount:25000, type:'expense', freq:'monthly', due:'2026-09-05' },
  { name:'Internet',   amount:800,   type:'expense', freq:'monthly', due:'2026-09-10' },
  { name:'Netflix',    amount:1500,  type:'expense', freq:'monthly', due:'2026-09-15' },
]);

function renderScheduled() {
  el('scheduledList').innerHTML = scheduled.map((s, i) => `
    <div class="sched-item">
      <div class="sched-left">
        <div class="sched-icon ${s.type}">${s.type==='income'?'📥':'📤'}</div>
        <div>
          <div class="sched-name">${s.name}</div>
          <div class="sched-meta">${s.freq.charAt(0).toUpperCase()+s.freq.slice(1)} · Next: ${s.due ? new Date(s.due).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'N/A'}</div>
        </div>
      </div>
      <div class="sched-amount ${s.type==='income'?'green':'red'}">${s.type==='income'?'+':'–'}${fmt(s.amount)}</div>
    </div>`).join('');
}

function initScheduled() {
  renderScheduled();
  el('addScheduledBtn').addEventListener('click', () => el('scheduledModal').classList.remove('hidden'));
  el('cancelScheduled').addEventListener('click', () => el('scheduledModal').classList.add('hidden'));
  el('saveScheduled').addEventListener('click', () => {
    const name   = el('schedNameInput').value.trim();
    const amount = parseFloat(el('schedAmountInput').value) || 0;
    const type   = el('schedTypeInput').value;
    const freq   = el('schedFreqInput').value;
    const due    = el('schedDueInput').value;
    if (name && amount) {
      scheduled.push({ name, amount, type, freq, due });
      lsSet('scheduled', scheduled);
      renderScheduled();
      el('scheduledModal').classList.add('hidden');
      ['schedNameInput','schedAmountInput','schedDueInput'].forEach(id => el(id).value='');
    }
  });
}

// ─────────────────────────────────────────────
// RANGE FILTER BUTTONS
// ─────────────────────────────────────────────
function initRangeFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildTrendChart(btn.dataset.range);
    });
  });
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────
function initSettings() {
  el('exportCSVBtn').addEventListener('click', exportCSV);
  el('clearDataBtn').addEventListener('click', () => {
    if (confirm('Clear all locally stored data (budgets, goals, debts, scheduled)?')) {
      ['budgets','goals','debts','scheduled'].forEach(k => localStorage.removeItem('ledgr_'+k));
      location.reload();
    }
  });
  el('darkToggle').addEventListener('change', e => toggleDarkMode(e.target.checked));
  el('darkModeBtn').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('light-mode');
    el('darkModeBtn').textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
  });
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      document.documentElement.style.setProperty('--accent', sw.dataset.color);
    });
  });
}

function toggleDarkMode(light) {
  document.body.classList.toggle('light-mode', light);
}

function exportCSV() {
  const header = 'Month,Income,Salary (Cash),Salary (Accrual),Spent,Net Savings (Cash),Net Savings (Accrual),Transactions,Balance\n';
  const rows = MONTHLY_DATA.map(d =>
    `${d.label},${d.income},${d.salary},${d.accrualSalary},${d.spent},${d.savings},${d.normalizedSavings},${d.tx},${d.balance}`
  ).join('\n');
  const blob = new Blob([header+rows], { type:'text/csv' });
  const a = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:'ledgr_export.csv' });
  a.click();
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  initNav();

  // Dashboard charts
  buildTrendChart('all');
  buildSavingsRateChart();
  buildBalanceChart();
  buildNetSavingsChart();
  initRangeFilters();

  // Analytics charts
  buildYearlyChart();
  buildTxChart();
  buildYearlySavingsBar();
  buildYearlyTable();

  // Feature pages
  initCalendar();
  initTransactions();
  initBudget();
  initSavings();
  initDebts();
  initScheduled();
  initSettings();

  // Start on dashboard
  navigate('dashboard');

  // After initial render, try to refresh with live data from Cloudflare Worker.
  // If WORKER_URL is null or fetch fails, stays on baked-in data silently.
  tryLoadLiveData();
});
