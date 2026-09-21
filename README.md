# FPL AY — FPL price tracker

A lightweight, installable FPL price tracker using TypeScript, Vite and Cloudflare Pages.

## Structure

- `index.html` — semantic HTML shell and app markup; no inline CSS or application JavaScript
- `src/main.ts` — application state, filtering, sorting and rendering
- `src/api/fpl.ts` — canonical FPL API client
- `src/storage.ts` — local persistence and snapshots
- `src/utils.ts` — shared event/countdown helpers
- `src/styles.css` — application styling
- root `pwa-enhance.js`, `jersey-fix.js`, `team-menu.js` — focused UI modules imported by the TypeScript app
- `_worker.js` — Cloudflare Pages Advanced Mode API worker
- `manifest.json`, `sw.js`, `icon-*.png` — PWA assets
- `scripts/postbuild.mjs` — copies Cloudflare/PWA runtime files into Vite output

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Cloudflare Pages:
- Build command: `npm run build`
- Output directory: `dist`

The browser uses the Cloudflare worker's `/fpl`, `/team` and `/price-data` routes instead of the old public CORS-proxy chain. The worker no longer rewrites HTML or injects client scripts.
