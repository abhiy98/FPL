# FPL AY — FPL price tracker

A lightweight, installable FPL price tracker using plain HTML, CSS and browser-native JavaScript modules.

## Structure

- `index.html` — page structure and app markup
- `styles.css` — application styling
- `app.js` — application state, filtering, sorting, rendering and interactions
- `api.js` — FPL API client
- `storage.js` — local persistence and snapshots
- `utils.js` — shared helpers
- `pwa-enhance.js`, `jersey-fix.js`, `team-menu.js` — focused UI modules
- `_worker.js` — Cloudflare Pages worker for `/fpl`, `/team` and `/price-data`
- `manifest.json`, `sw.js`, `icon-*.png` — PWA files

## Testing locally

There is no build step.

From the repository root, run any simple static web server, for example:

```bash
python3 -m http.server 8080
```

Then open:

`http://localhost:8080`

The app expects the Cloudflare worker routes for live API access. For the deployed Cloudflare Pages site, the worker supplies those routes automatically.

## Cloudflare Pages

This branch is intentionally build-free so the source `index.html` can be served directly by Cloudflare Pages.

- Build command: leave blank
- Build output directory: `/` (project root)

The Pages worker handles:
- `/fpl`
- `/team`
- `/price-data`

No Vite, TypeScript compiler or HTML post-processing is required.
