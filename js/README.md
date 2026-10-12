# Formy editor

The front end of Formy: a Tiptap (ProseMirror) document editor with a Lit UI,
built into `dist/` and attached by Drupal through `formy.libraries.yml`.

## Commands

```bash
npm ci             # install
npm run demo       # build, then serve the editor with a mock API on :8787
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit tests (test/)
npm run test:e2e   # Playwright browser tests (e2e/), against the demo server
```

If Playwright's own browsers are not installed, set `CHROME_PATH` to any
Chromium or Chrome binary before `npm run test:e2e`.

## Layout

| Path | Role |
| --- | --- |
| `src/index.ts` | Entry: Drupal behavior, and `window.Formy.mount()` |
| `src/app.ts` | `<formy-app>`: load, save, errors, top bar, settings panel |
| `src/sdk.ts` | Public types and extension contracts |
| `src/api.ts` | JSON API client (CSRF token, error mapping) |
| `src/registry.ts` | Component definitions and "/" search |
| `src/keys.ts` | Element key and block id rules |
| `src/editor/` | Tiptap extensions: field node, handle, "/" command, block identity |
| `src/ui/` | Lit elements: slash menu, settings panel, previews, icons |
| `src/extensions/` | Separately built extensions (signature preview) |
| `demo/` | Demo page, mock API server and fixtures |

`demo/fixtures/components.json` and `document.json` come from the PHP
converter. Regenerate them when components change, so the demo matches
Drupal.

## Notes

- `dist/` is committed so sites need no Node toolchain. CI checks that it
  matches the sources.
- Lit elements use light DOM (`createRenderRoot() { return this; }`) so one
  stylesheet styles everything. Scope new styles under `.formy-ui`.
- Do not name a Lit element method `renderOptions`: LitElement uses that
  name internally.
