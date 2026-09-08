# Price Watch — FPL price tracker

## What's in the folder
- `index.html` — the app (frozen player column, sortable/searchable table, live refresh)
- `manifest.json` + `sw.js` — makes it installable as a PWA (add-to-home-screen, offline app shell)
- `icon-192.png` / `icon-512.png` — app icons
- `netlify.toml` + `netlify/functions/fpl.js` — a tiny serverless function that fetches FPL data **server-side**, so there's no browser CORS problem at all. This is the primary data source; public CORS proxies are kept only as a backup.

## Deploying
**Use Netlify** (the function needs it, or an equivalent serverless host):
1. Go to https://app.netlify.com/drop and drag the **whole folder** in (must include `netlify.toml` and the `netlify/functions/` folder, not just `index.html`) — or for functions to build correctly, it's more reliable to connect a GitHub repo in Netlify ("Add new site" → "Import an existing project") rather than a plain drag-and-drop, since Drop doesn't always run the functions build step.
2. Once deployed, visit `https://your-site.netlify.app/.netlify/functions/fpl` directly in your browser — you should see raw FPL JSON. If you see an error page instead, the function didn't deploy (see below).
3. Open the main site and it should now show live data immediately.

If you deployed via drag-and-drop and the function route 404s: redeploy by connecting the folder as a GitHub repo through Netlify's Git-based flow instead — that reliably picks up `netlify.toml` and builds the function. (Netlify Drop is a static-only fast path and doesn't always provision functions.)

Other hosts (GitHub Pages, plain static hosts) **won't run the function** — the app will silently fall back to the public CORS proxies, which is what was failing before.

Once it's live on https, open it on your phone in Safari/Chrome → Share/menu → **Add to Home Screen**.


FPL doesn't push updates — it recalculates prices roughly once a day (usually overnight UK time) and the site polls every 3 minutes plus whenever you reopen the tab, so you'll pick up a change shortly after it happens.

## Columns
- **GW1 price** — each player's starting price (current price minus their total price change so far)
- **Current** — live price right now
- **Total Δ** — full change since GW1
- **This GW** — change just in the current gameweek
- **Owned** — % of managers who own them

Tap "Movers only" to hide anyone at £0.0 total change. Tap any column header to sort; tap again to flip direction.
