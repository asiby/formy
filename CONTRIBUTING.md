# Contributing to Formy

## Local setup

1. A Drupal 10.3+ or 11 site with Webform 6.3 (DDEV works well).
2. Clone this repository into `web/modules/custom/formy` and run
   `drush en formy`.
3. For editor work, install Node 22 and run `npm ci` in `js/`.

## Everyday commands

| What | Where | Command |
| --- | --- | --- |
| PHP unit tests | Drupal root | `vendor/bin/phpunit -c web/core web/modules/custom/formy/tests/src/Unit` |
| Try the editor without Drupal | `js/` | `npm run demo`, then open http://localhost:8787/demo/ |
| Rebuild the editor on change | `js/` | `npm run watch` |
| Type check | `js/` | `npm run typecheck` |
| Editor unit tests | `js/` | `npm test` |
| Browser tests | `js/` | `npm run build && npm run test:e2e` |

Open `/demo/?responses=1` to try the editor on a form that already has
responses.

CI runs all of the above on every push and pull request.

## Ground rules

- **Never change a component ID or a saved key.** Both are stored: IDs in
  documents, keys in every response.
- **The webform is the source of truth.** Formy stores nothing of its own.
  If you need new data, it belongs in the Webform element.
- **Never trust the browser with element properties.** The browser sends
  settings; components turn them into elements on the server. See
  "Trust model" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Import must be lossless.** If a component cannot represent an element
  exactly, `fromElement()` returns `NULL` and the element stays locked.
- **Commit `js/dist`.** Run `npm run build` after editor changes; CI fails if
  the committed build is stale.

## Where things go

- A new kind of question: a component plugin plus a test. See
  [docs/WRITING_A_COMPONENT.md](docs/WRITING_A_COMPONENT.md).
- Rules about documents (keys, validation, import, compile):
  `src/Document/`, with tests in `tests/src/Unit/DocumentConverterTest.php`.
- Canvas behaviour: `js/src/editor/`. UI pieces: `js/src/ui/`.
- Types other modules rely on: `js/src/sdk.ts`. Treat changes there as
  breaking changes.

## Code style

- PHP follows Drupal coding standards with `declare(strict_types=1)`.
  Document why, not what.
- TypeScript is strict. Lit elements render in light DOM and are styled in
  `js/src/styles.css`, scoped under `.formy-ui`.
- User-facing text is sentence case, plain and specific. Errors say what
  happened and what to do.

## Pull requests

- One topic per pull request, with a short description of the user-visible
  change.
- Add or update tests with the change.
- Screenshots or a short recording for UI changes.
