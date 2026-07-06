# Bogen-Trainingsturnier Verwaltung 🎯

A client-side web app (installable PWA) that lets an archery club trainer run informal training tournaments as judge (Kampfrichter) — from pre-tournament setup, through shooter registration and live score entry, to ranked results. Fully usable **offline**, on a single device, at the shooting range.

> Score entry and results ranking must work correctly and offline, on one device, during a live tournament — everything else is secondary.

## Features

- **Setup** — define classes (age group / bow type / distance), shooting lines, and rounds/passes (WA presets or custom), with 4–8 savable/loadable tournament presets (export/import included)
- **Registration** — register shooters with name, class, and optional shooting-line assignment; app detects AB vs. AB/CD mode automatically
- **Score Entry** — per-arrow score entry with instant autosave (no explicit save step, no data loss), sortable table, and an explicit "Abschließen" (finalize/lock) step once every arrow is entered
- **Results** — live-updating, correctly-ranked results per class (standard "1-2-2-4" tie handling), adaptive layout: dropdown class selector on phone, responsive multi-column grid on tablet/desktop
- **Reset** — explicit "Neues Turnier starten" action clears shooters/scores while keeping classes, lines, rounds, and presets configured
- **Offline-first PWA** — installable to your device's home screen, fully functional with zero network connectivity, automatic light/dark theme with manual override
- **Data safety** — once a tournament is finalized, destructive edits (deleting shooters, changing rounds/passes) are blocked until you reset

## Tech Stack

- [Svelte 5](https://svelte.dev/) (runes) + [Vite 8](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Dexie.js](https://dexie.org/) (IndexedDB) for local, offline-first data storage
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for the installable, offline service worker
- [Vitest](https://vitest.dev/) + [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro/) for unit/component tests, [Playwright](https://playwright.dev/) for e2e tests

## Installation

**Requirements:** Node.js `^20.19.0` or `>=22.12.0`

```bash
git clone https://github.com/JoeSey/InstantBogenturnier.git
cd InstantBogenturnier
npm install
```

## Development

```bash
npm run dev       # start the dev server (hot reload)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## Testing

```bash
npm run check     # type-check (svelte-check + tsc)
npm run test      # unit/component tests (Vitest)
npm run test:e2e  # end-to-end tests (Playwright)
npm run test:all  # unit + e2e
```

## Deployment

This is a static, client-only app — deploy the **built output**, not the source tree.

```bash
npm run build   # writes the deployable site to dist/
```

Copy the contents of `dist/` to your web server's document root (or a sub-path — see
below). `npm run preview` serves `dist/` locally if you want to sanity-check a build
before deploying it.

**Common mistake:** if the browser fails to load `main.ts` with an error like
`Expected a JavaScript-or-Wasm module script but the server responded with a MIME
type of "text/vnd.trolltech.linguist"`, the server is serving the *repository source*
(`index.html` at the project root references `/src/main.ts` directly, which only
Vite's dev server knows how to transpile) instead of `dist/`. Many Linux systems'
global MIME database maps the `.ts` extension to Qt Linguist translation files, which
is where that specific error text comes from. Point your web server at `dist/`, not
the repo root.

### Deploying to a sub-path

If the app won't be served from your domain's root (e.g.
`https://example.com/bogenturnier/` instead of `https://example.com/`), set `basePath`
in `src/lib/config/app.config.ts` to that sub-path (with leading **and** trailing
slash, e.g. `'/bogenturnier/'`) before running `npm run build`. This value drives both
Vite's asset base path and the PWA manifest's `scope`/`start_url` — both must match the
actual hosting path or the installed PWA's service-worker scope will be wrong and
offline routing will silently break.

## Project Status

All v1.0 milestone phases are complete: Foundation, Setup & Registration, Score Entry, Results. See [`specs.md`](specs.md) for the original feature spec and [`.planning/`](.planning/) for detailed requirements, decisions, and per-phase implementation records.

## License

[MIT](LICENSE)
