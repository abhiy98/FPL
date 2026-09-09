# Price Watch — FPL price tracker

## What's in the folder
- `index.html` — the app (frozen player column, searchable/filterable table, live refresh and player details)
- `manifest.json` + `sw.js` — installable PWA shell with offline caching and enhancement injection
- `worker.js` — Cloudflare Worker for the FPL, team and price-predictor APIs
- `wrangler.jsonc` — Cloudflare Worker + static assets configuration
- `scripts/patch-index.js` — deterministic build transformation and structural validation
- `scripts/verify-build.js` — standalone build-output smoke test
- `functions/` and `netlify/` — legacy deployment handlers retained for reference while Cloudflare is the primary deployment target

## Cloudflare deployment

Cloudflare Workers is the primary deployment target. Set the Workers Build command to:

```text
node scripts/patch-index.js && node scripts/verify-build.js
```

Then deploy with `npx wrangler deploy`.

The build step produces the final `index.html`; the Cloudflare Worker serves that HTML and handles the `/fpl`, `/team` and `/price-data` API routes. The service worker adds the player-photo, status and scrolling enhancements for the installed/served app.

## FPL data

The app retrieves `bootstrap-static/` through `/fpl`, rejects incomplete player payloads, and polls every 3 minutes plus when the tab becomes visible. Price predictor data is loaded separately from `/price-data` with a direct LiveFPL fallback. The price-change countdown uses UK midnight and is shown only in the dashboard card.

## Columns

- **Player** — player name, position, club abbreviation and quick actions
- **Status** — price-change likelihood from the predictor when available
- **Progress %** — current price-change progress from the predictor
- **Prediction %** — predicted overnight price-change progress
- **GW1 price** — starting price, calculated from current price minus total change
- **Current** — current FPL price
- **Total Δ** — total price change since GW1
- **This GW** — price change in the current gameweek
- **Total Points** — season total FPL points
- **Owned** — percentage of managers who own the player

Player photos use multiple Premier League asset paths and fall back to a team-colored jersey when no player image is available. The table defaults to price-change status order and can be manually sorted by any column.
