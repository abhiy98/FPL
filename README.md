# Price Watch — FPL price tracker

## Project structure
- `index.html` — canonical app UI, state, data loading, dashboard, table rendering and sorting
- `_worker.js` — Cloudflare Pages Advanced Mode worker for `/fpl`, `/team` and `/price-data`, plus the single HTML enhancement injection point
- `manifest.json` + `sw.js` — installable PWA and service-worker cache/offline layer
- `icon-192.png` + `icon-512.png` — PWA icons
- `jersey-fix.js`, `pwa-enhance.js`, `team-menu.js` — focused presentation enhancements
- `scripts/patch-index.js` — deterministic Pages build transformation and structural verification

Cloudflare Pages is the only deployment target. Legacy Netlify, standalone Wrangler configuration, and separate CI/build-verification files are no longer part of the repository.

## Cloudflare Pages deployment

Use the repository's `Reorg` branch in Cloudflare Pages with this build command:

```text
node scripts/patch-index.js
```

The build script transforms `index.html` into the final app and verifies the required table, predictor, snapshot, dashboard, sorting, and PWA structures before completing. The Pages worker serves static assets through `env.ASSETS` and handles the API routes directly.

The Cloudflare worker is the only layer that injects client enhancement scripts. The service worker only caches and serves those already-enhanced responses; it does not rewrite HTML.

## FPL data

The app retrieves `bootstrap-static/` through `/fpl`, rejects incomplete player payloads, and refreshes periodically plus when the tab becomes visible. Price-predictor data is loaded separately from `/price-data` with a direct LiveFPL fallback. The price-change countdown uses UK midnight and is shown in the dashboard card.

## Columns

- **Player** — player name, position, club abbreviation and favourite action
- **Status** — price-change likelihood from the predictor when available
- **Progress %** — current price-change progress from the predictor
- **Prediction %** — predicted overnight price-change progress
- **GW1 price** — starting price, calculated from current price minus total change
- **Current** — current FPL price
- **Total Δ** — total price change since GW1
- **This GW** — price change in the current gameweek
- **Total Points** — season total FPL points
- **Owned** — percentage of managers who own the player

Player photos use multiple Premier League asset paths and fall back to a team-colored jersey when no player image is available. The table defaults to absolute Progress % magnitude and the Progress % header cycles through signed high→low, signed low→high, and absolute high→low. Other columns use standard two-state sorting and the selected sort persists locally.
