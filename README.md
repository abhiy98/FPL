# Price Watch — FPL price tracker

## What's in the folder
- `index.html` — the app (frozen player column, sortable/searchable table, live refresh)
- `manifest.json` + `sw.js` — makes it installable as a PWA (add-to-home-screen, offline app shell)
- `worker.js` — Cloudflare Worker that serves the site and proxies FPL API requests
- `wrangler.jsonc` — Cloudflare Worker + static assets configuration
- `functions/` — legacy Cloudflare Pages Functions kept for reference while the Worker deployment is tested

## Deploying with Cloudflare Workers Builds

Cloudflare Workers is the primary deployment target. Connect the GitHub repository and set the production branch to `main`. Workers Builds can deploy pushes automatically and create non-production preview versions for other branches.

Build settings:
- Build command: `node scripts/patch-index.js`
- Production deploy command: `npx wrangler deploy`
- Non-production deploy command: `npx wrangler versions upload`

`wrangler.jsonc` configures `worker.js` as the Worker entry point and the repository root as the static asset directory. The Worker handles `/fpl` and `/team`, then serves the static site through the `ASSETS` binding.

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
