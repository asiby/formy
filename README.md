# Formy

A user-friendly form composer for Drupal. Formy gives editors a document-style
editor for [Webform](https://www.drupal.org/project/webform): you write the form
like a page, type `/` to add a question, and drag blocks to reorder them.
Webform still stores the form and handles submissions, emails, exports and
permissions. Formy only replaces the authoring experience.

> **Status: proof of concept (0.1).** The core loop works end to end (insert,
> edit, reorder, save, reopen). It is ready for the team to install on a test
> site, not for production. See [Known gaps](#known-gaps).

## What editors get

- **The form is a document.** Headings and paragraphs are typed directly;
  questions sit between them.
- **`/` inserts anything.** A searchable menu lists every registered
  component: short and long answers, email, number, date, single choice,
  checkboxes, signature, heading and text.
- **Editing in place.** Question labels are edited on the canvas. A side
  panel holds the rest (help text, required, choices, placeholders).
- **Drag handle, keyboard moves.** Every block has a handle in the margin
  ("+" to add below, grip to drag), toolbar buttons, and `Alt+↑` / `Alt+↓`.
- **Safe with existing forms.** Anything Formy cannot edit (an address, a
  fieldset, custom HTML…) stays as a locked "advanced field" that can be moved
  or removed but is never changed. Properties set in Webform's own UI are
  preserved.
- **Safe with existing responses.** Once a form has submissions, questions
  with answers cannot be deleted or turned into another type.
- **Safe with other editors.** If the form changed elsewhere since it was
  opened, saving is refused with a prompt to reload.

## Requirements

- Drupal 10.3 or 11, PHP 8.1+
- Webform 6.3

## Install

```bash
# From your Drupal project root
composer config repositories.formy vcs https://github.com/asiby/formy
composer require asiby/formy:dev-main
drush en formy
```

Or clone this repository into `web/modules/custom/formy`. The built editor
(`js/dist`) is committed, so no Node toolchain is needed on the server.

Then open any webform and choose the **Compose** tab, or go to
`/admin/structure/webform/manage/{webform}/compose`. Anyone who can edit a
webform can compose it.

## Repository layout

| Path | What it is |
| --- | --- |
| `src/Attribute/FormyComponent.php` | The `#[FormyComponent]` attribute that declares a component |
| `src/Plugin/` | Component interface, base classes and the component plugins |
| `src/Document/` | Pure-PHP conversion between Webform elements and Formy documents |
| `src/Controller/` | The editor page and its JSON API |
| `js/src/` | The editor (TypeScript, Tiptap/ProseMirror, Lit) |
| `js/dist/` | Built editor, attached as Drupal libraries |
| `js/demo/` | The editor with a mock API, runnable without Drupal |
| `tests/src/Unit/` | PHPUnit tests |
| `docs/` | Architecture and how-to guides |

## Documentation

- [Architecture](docs/ARCHITECTURE.md): how the pieces fit, and the rules
  that keep data safe.
- [Writing a component](docs/WRITING_A_COMPONENT.md): add a new kind of
  question, with or without custom TypeScript.
- [Contributing](CONTRIBUTING.md): local setup, tests and conventions.
- [Editor (js/)](js/README.md): building and testing the front end.

## Known gaps

These are deliberate omissions from the proof of concept:

- Multi-page forms, conditional logic and form-level settings (confirmation,
  emails) are edited in Webform's own UI for now.
- Canvas previews are drawn by the editor, not rendered by Drupal.
- Webform's own elements validator is not yet run before saving
  (`ApiController::save()` has a TODO).
- Content blocks are plain text (no bold, links or lists).
- Validation messages from the server are in English and not translatable yet.
- The "Compose" tab placement (`formy.links.task.yml`) needs checking on a
  real site.

## License

GPL-2.0-or-later. See [LICENSE.txt](LICENSE.txt).
