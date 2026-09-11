# Price Watch — FPL price tracker

## Project structure
- `index.html` — the app UI and client-side data loading
- `_worker.js` — Cloudflare Pages Advanced Mode worker for `/fpl`, `/team` and `/price-data`
- `manifest.json` + `sw.js` — installable PWA and service-worker cache
- `icon-192.png` + `icon-512.png` — PWA icons
- `jersey-fix.js`, `scroll-fix.js`, `pwa-enhance.js` — client-side enhancements
- `scripts/patch-index.js` — deterministic Pages build transformation
- `scripts/verify-build.js` — CI smoke test for the generated build
- `.github/workflows/verify.yml` — GitHub Actions verification

Cloudflare Pages is the only deployment target. Legacy Netlify and standalone Wrangler configuration have been removed.

## Cloudflare Pages deployment

Use the repository's `Reorg` branch in Cloudflare Pages with this build command:

```text
node scripts/patch-index.js && node scripts/verify-build.js
```

The Pages output uses `_worker.js` in Advanced Mode. Cloudflare's Pages worker serves the static assets through `env.ASSETS` and handles the API routes directly. citeturn952029view0

## FPL data

The app retrieves `bootstrap-static/` through `/fpl`, rejects incomplete player payloads, and refreshes periodically plus when the tab becomes visible. Price-predictor data is loaded separately from `/price-data` with a direct LiveFPL fallback. The price-change countdown uses UK midnight and is shown in the dashboard card.

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

Player photos use multiple Premier League asset paths and fall back to a team-colored jersey when no player image is available. The table defaults to price-change ordering and can be manually sorted by any column.
