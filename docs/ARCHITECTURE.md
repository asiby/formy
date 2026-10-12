# Architecture

> **Planned change:** Formy is moving from Webform to regular content types,
> with automatic form versioning. See the
> [design proposal](DESIGN-content-types.md). This document describes the
> current Webform proof of concept.

Formy is a new authoring experience on top of Webform. Webform remains the
source of truth for the form and for everything that happens after a
respondent submits it.

```
 Browser (js/src)                          Drupal (src/)
 ┌──────────────────────────────┐          ┌─────────────────────────────────┐
 │ Tiptap editor                │  GET     │ ApiController::load()           │
 │  paragraphs, headings,       │◄─────────│   DocumentConverter::import()   │
 │  formyField nodes            │ document │     elements ──► document       │
 │                              │          │                                 │
 │ document.ts                  │  POST    │ ApiController::save()           │
 │  editor JSON ──► document    │─────────►│   DocumentConverter::compile()  │
 │                              │ document │     document ──► elements       │
 │ Lit UI: slash menu, panel,   │          │   ChangeGuard (if responses)    │
 │  block handle                │          │   $webform->setElements()       │
 └──────────────────────────────┘          └─────────────────────────────────┘
               ▲                                         │
               │ component definitions (GET)             │
               └───────────── FormyComponentManager ◄────┘
                               (#[FormyComponent] plugins)
```

## The document

The editor and the server exchange a small JSON document:

```json
{
  "version": 1,
  "blocks": [
    { "id": "b_full_name", "type": "short_text", "key": "full_name",
      "settings": { "label": "Full name", "help": "", "required": true,
                    "placeholder": "", "maxLength": null } }
  ]
}
```

- `type` is a component ID, or `_advanced` for an element Formy cannot edit.
- `key` is the Webform element key. Responses are stored under it, so it
  **never changes after the first save**. New blocks get a key from their
  label when they are first saved.
- `settings` is whatever the component's schema declares.

Nothing else is stored. Every load re-imports the webform's current
elements, so changes made in Webform's own UI always show up.

## Components

A component is a plugin with the `#[FormyComponent]` attribute that
converts between its settings and a Webform element:

- `getSettingsSchema()` declares the settings. The editor generates the
  settings panel from it, and the server validates against it.
- `toElement(array $settings): array` builds the element.
- `fromElement(array $element): ?array` reads settings back, or returns
  `NULL` if the element is beyond what the component can represent.

`toElement()` and `fromElement()` must be inverses. `FormyComponentTestBase`
checks this for every component, for free.

On the front end, a component needs no code at all. It may optionally name
custom elements for a canvas preview (`BlockPreviewElement`) or a settings
editor (`SettingsAccessor`, the same contract as Angular's
ControlValueAccessor). These are loaded from a Drupal library, so another
module can extend the editor without rebuilding it. See
[Writing a component](WRITING_A_COMPONENT.md).

## Import: lossless or locked

`DocumentConverter::import()` asks each candidate component (lowest weight
first) to read an element. A component's import is only accepted when it is
faithful: its settings validate, and `toElement(settings)` reproduces every
property it produces with identical values. Otherwise the next component is
tried, and if none fits, the element becomes a locked `_advanced` block.

Properties a component does not manage (say `#title_display` set in Webform's
UI) are kept as "extra" properties and merged back when compiling, as long
as the block keeps the same component type.

## Trust model

The browser only ever sends settings, which each component validates. It
never sends raw element arrays:

- Advanced fields are re-read from the webform's **current** elements by key
  when saving. The editor can move or remove them, but not create or change
  them.
- Extra properties are re-read the same way. The browser cannot inject
  element properties such as `#element_validate` or `#markup`.
- Unknown settings are rejected.
- Saves require Drupal's CSRF header token, update access to the webform,
  and a matching revision (a hash of the elements the editor loaded).

## Protecting responses

When a webform has submissions, `ChangeGuard` refuses saves that would
delete an input element or change its type (radios ↔ select is allowed: both
store one value). Labels, help text, choices and order can still change.

## The editor

- **Tiptap/ProseMirror** owns the document, the selection, undo/redo, typing,
  copy/paste and drop handling.
- **`formyField`** (`editor/field-node.ts`) is an atom node rendered with Lit:
  label input, inert preview, toolbar.
- **`BlockIdentity`** keeps a unique `blockId` on every top-level block and
  clears the key of pasted copies so they save as new questions.
- **`BlockHandle`** shows "+" and a drag grip in the margin. Dragging hands
  the block to ProseMirror's own drag machinery.
- **`SlashCommand`** runs the "/" menu on Tiptap's Suggestion utility.
- **`FormyApp`** (`app.ts`) loads, saves, maps server errors back to blocks,
  and implements `EditorContext` for the views.

The editor is plain TypeScript classes plus Lit elements in light DOM, so
the Drupal admin theme and `styles.css` style everything the same way.
