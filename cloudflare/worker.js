/**
 * Cloudflare Worker — Finance Data Proxy
 *
 * Serves data/finance_data.json from a private GitHub repo without exposing
 * the GitHub Personal Access Token to the browser.
 *
 * Environment variables (set in Cloudflare dashboard → Worker → Settings → Variables):
 *   GITHUB_TOKEN   - GitHub Personal Access Token with `contents:read` scope
 *   GITHUB_OWNER   - Your GitHub username (e.g. "nasif-parash")
 *   GITHUB_REPO    - Repository name (e.g. "personal-finance-assistant")
 *   GITHUB_BRANCH  - Branch to read from (e.g. "gh-pages")
 *
 * Deploy steps (one-time):
 *   1. Install Wrangler: npm install -g wrangler
 *   2. Login: wrangler login
 *   3. From cloudflare/ directory: wrangler deploy
 *   4. Add secrets: wrangler secret put GITHUB_TOKEN
 */

export default {
  async fetch(request, env) {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Build GitHub raw content URL
    const url = `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}/data/finance_data.json`;

    // Fetch from GitHub with auth token
    const githubResponse = await fetch(url, {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'Ledgr-Finance-Worker/1.0',
      },
      // Cache at Cloudflare edge for 5 minutes to reduce GitHub API calls
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (!githubResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data', status: githubResponse.status }),
        { status: githubResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await githubResponse.text();

    // Return data with CORS headers so your app.js can fetch it cross-origin
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',       // Allow from GitHub Pages URL
        'Cache-Control': 'public, max-age=300',   // Browser cache 5 minutes
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
