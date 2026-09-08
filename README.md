# Price Watch — FPL price tracker

## What's in the folder
- `index.html` — the app (frozen player column, sortable/searchable table, live refresh)
- `manifest.json` + `sw.js` — makes it installable as a PWA (add-to-home-screen, offline app shell)
- `icon-192.png` / `icon-512.png` — app icons
- `functions/fpl.js` + `functions/team.js` — Cloudflare Pages Functions that fetch FPL data server-side

## Deploying with Cloudflare Pages

Cloudflare Pages is the primary deployment target. Connect the GitHub repository and set the production branch to `main`. Cloudflare automatically creates preview deployments for other branches and pull requests.

Build settings:
- Framework preset: None
- Production branch: `main`
- Build command: `node scripts/patch-index.js`
- Build output directory: `.`

The `functions/` directory is at the repository root because Cloudflare Pages Functions use file-based routing from that directory. `functions/fpl.js` serves `/fpl`; `functions/team.js` serves `/team`.

For testing, push a feature branch such as `Changes` and use its Cloudflare preview deployment. Merging into `main` deploys production.

## Legacy Netlify deployment

The repository still contains the old `netlify/` files so the existing Netlify site can remain available while Cloudflare is being tested. They can be removed after Cloudflare has been verified.

## FPL data

FPL doesn't push updates — it recalculates prices roughly once a day (usually overnight UK time) and the site polls every 3 minutes plus whenever you reopen the tab, so you'll pick up a change shortly after it happens.

## Columns
- **GW1 price** — each player's starting price (current price minus their total price change so far)
- **Current** — live price right now
- **Total Δ** — full change since GW1
- **This GW** — change just in the current gameweek
- **Owned** — % of managers who own them

Tap "Movers only" to hide anyone at £0.0 total change. Tap any column header to sort; tap again to flip direction.
