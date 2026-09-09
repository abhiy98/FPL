# Price Watch — FPL price tracker

## What's in the folder
- `index.html` — the app (frozen player column, searchable/filterable table, live refresh and player details)
- `manifest.json` + `sw.js` — installable PWA shell with offline caching
- `worker.js` — Cloudflare Worker for the FPL, team and price-predictor APIs
- `wrangler.jsonc` — Cloudflare Worker + static assets configuration
- `scripts/patch-index.js` — deterministic build transformation and structural validation
- `functions/` and `netlify/` — legacy deployment handlers retained for reference while Cloudflare is the primary deployment target

## Cloudflare deployment

Cloudflare Workers is the primary deployment target. Set the Workers Build command to:

```text
node scripts/patch-index.js
```

Then deploy with `npx wrangler deploy`.

The build step produces the final `index.html`; the Cloudflare Worker serves that HTML unchanged and only handles API routes. The browser does not need a MutationObserver or post-render UI repair layer.

## FPL data

The app retrieves `bootstrap-static/` through `/fpl`, validates that the payload contains a complete player set, and polls every 3 minutes plus when the tab becomes visible. Price-change countdowns use UK midnight and are shown in the dashboard card.

## Columns

- **Player** — player name, position and club abbreviation
- **Status** — price-change likelihood from the predictor when available
- **GW1 price** — starting price, calculated from current price minus total change
- **Current** — current FPL price
- **Total Δ** — total price change since GW1
- **This GW** — price change in the current gameweek
- **Total Points** — season total FPL points
- **Owned** — percentage of managers who own the player

All table headers and data cells share the same column geometry and are centered. Player rows and filter controls are keyboard accessible.
