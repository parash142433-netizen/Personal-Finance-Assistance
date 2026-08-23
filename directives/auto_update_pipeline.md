# Directive: Auto-Update Pipeline

## Goal
Automatically update the Ledgr web app (GitHub Pages) whenever the Google Sheets finance file changes — zero manual steps required.

## Architecture

```
Google Sheets → Apps Script → GitHub API → GitHub Actions → GitHub Pages
                                                   ↑
                                           You: git push (for code changes)
```

## Data Flow

### Path A: Monthly data update (100% automatic)
1. You add/update a row in Google Sheets
2. Apps Script `onSheetChange` trigger fires (or monthly cron fires)
3. Apps Script reads all rows, computes aggregates, commits `data/finance_data.json` to GitHub
4. GitHub Actions detects the push, runs the build pipeline
5. `inject_data.py` regenerates `app.js` constants
6. `bundle_standalone_html.py` rebuilds `ledgr-mobile.html`
7. Built files deploy to GitHub Pages
8. Live app at `https://<user>.github.io/<repo>/` is updated in ~2 minutes

### Path B: Code change deployment (one command)
1. Edit `index.html`, `styles.css`, or `app.js` locally
2. Press `Ctrl+Shift+B` in VS Code (or run `git add -A && git commit -m "msg" && git push`)
3. Same GitHub Actions pipeline runs, deploys in ~60 seconds

## Key Files

| File | Purpose |
|------|---------|
| `data/finance_data.json` | Machine-generated, single source of truth for all finance data |
| `execution/analyze_expenditure.py --output` | Local bootstrap: reads xlsx, writes finance_data.json |
| `execution/inject_data.py` | CI step: reads finance_data.json, regenerates app.js constants |
| `execution/bundle_standalone_html.py` | CI step: bundles index.html+css+js into ledgr-mobile.html |
| `.github/workflows/deploy.yml` | GitHub Actions pipeline |
| `cloudflare/worker.js` | Proxy: serves finance_data.json to app at runtime without exposing token |
| `scripts/apps_script.js` | Google Apps Script: reads Sheet, commits JSON to GitHub |

## Secrets & Tokens

| Secret | Where Stored | What It's For |
|--------|-------------|---------------|
| GitHub PAT (`contents:write`) | Apps Script PropertiesService | Apps Script → commit to GitHub |
| GitHub PAT (`contents:read`) | Cloudflare Worker env vars | Worker → read file from private repo |
| `GITHUB_TOKEN` (auto) | GitHub Actions built-in | Deploy to gh-pages branch |

## How to Manually Trigger

**Apps Script (skip waiting for trigger):**
- Open script.google.com → your script → select `onSheetChange` → Run

**GitHub Actions (skip waiting for push):**
- GitHub repo → Actions tab → "Build and Deploy" → Run workflow

**Full local rebuild (no GitHub needed):**
```bash
python execution/analyze_expenditure.py --output
python execution/inject_data.py
python execution/bundle_standalone_html.py
```

## Troubleshooting

### Apps Script not running
- Check Triggers (clock icon) — `onSheetChange` must be set to "On change"
- Check Executions log for errors
- Verify GitHub token is stored: Run → `storeToken` (re-paste token if needed)

### GitHub Actions failing
- Go to repo → Actions tab → click the failed run → read the error log
- Common cause: `data/finance_data.json` missing → run `analyze_expenditure.py --output` locally and push

### Cloudflare Worker errors
- Check Workers dashboard → Logs
- Verify `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` are all set as secrets

### App showing stale data
- Worker caches data for 5 minutes — hard refresh (`Ctrl+Shift+R`) bypasses browser cache
- If still stale, check if GitHub Actions completed (repo → Actions tab)

## Edge Cases Learned
- argparse runs at import time, so `analyze_expenditure.py` must be run from the command line (not imported)
- GitHub API requires the file's current SHA to update an existing file (handled in Apps Script)
- Cloudflare Worker free tier: 100,000 requests/day — more than sufficient for personal use
- GitHub Actions: `GITHUB_TOKEN` secret is automatically available — no setup needed
