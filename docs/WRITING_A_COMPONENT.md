# Writing a component

A component is one kind of block editors can insert with `/`. Most
components are a single PHP class and a test. TypeScript is optional.

This guide adds a **Phone** component on top of Webform's `tel` element.

## 1. The PHP class

Create `src/Plugin/Formy/Component/Phone.php` (in this module, or in
`src/Plugin/Formy/Component/` of any other module):

```php
<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\QuestionComponentBase;

#[FormyComponent(
  id: 'phone',
  label: new TranslatableMarkup('Phone'),
  description: new TranslatableMarkup('A phone number'),
  icon: 'text',
  element_types: ['tel'],
  preview: 'text',
  weight: 5,
)]
final class Phone extends QuestionComponentBase {

  protected function elementType(): string {
    return 'tel';
  }

}
```

That's a working component. `QuestionComponentBase` provides the label,
help text and "Required", and both conversions.

### Attribute reference

| Key | Meaning |
| --- | --- |
| `id` | Block type in documents. Never rename once forms use it. |
| `label`, `description` | Shown in the `/` menu. |
| `category` | Menu group; defaults to "Questions". |
| `icon` | One of the names in `js/src/ui/icons.ts`. |
| `element_types` | Webform `#type`s this component may import. |
| `preview` | Built-in canvas preview: `text`, `textarea`, `email`, `number`, `date`, `radios`, `checkboxes`, `signature`, `heading`, `paragraph`, `generic`. |
| `preview_element` | Optional custom element tag replacing the preview. |
| `settings_editor` | Optional custom element tag replacing the settings panel. |
| `library` | Drupal library defining those custom elements. |
| `weight` | Menu order, and import priority (lowest first). |
| `insertable` | `FALSE` hides it from the menu (import only). |

## 2. Extra settings

Declare them in `extraSettingsSchema()` and map them both ways:

```php
protected function extraSettingsSchema(): array {
  return [
    'placeholder' => [
      'type' => 'string',
      'title' => $this->t('Placeholder'),
      'maxLength' => 255,
    ],
  ];
}

protected function extraToElement(array $settings): array {
  return ['#placeholder' => $settings['placeholder'] ?? ''];
}

protected function extraFromElement(array $element): ?array {
  $placeholder = static::readString($element, '#placeholder');
  return $placeholder === NULL ? NULL : ['placeholder' => $placeholder];
}
```

Setting types: `string`, `text` (multi-line), `boolean`, `integer`, `enum`
(with `'enum' => [value => label]`), `options` (a list of
`['value' => …, 'label' => …]`). Add `'group' => 'advanced'` to fold a setting
under "Advanced". See `FormyComponentInterface::getSettingsSchema()`.

Two rules keep round trips exact:

1. **Leave out empty values** in `toElement()`. `QuestionComponentBase` does
   this for you (empty strings, `NULL`, `FALSE` and `[]` are dropped).
2. **Return `NULL` from `fromElement()`** for anything you cannot represent
   exactly, such as a property of an unexpected type. The element then stays a
   locked advanced field, which is always safe.

## 3. The test

Create `tests/src/Unit/Component/PhoneTest.php`:

```php
final class PhoneTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return Phone::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Phone', 'help' => '', 'required' => FALSE],
      ['label' => 'Mobile', 'help' => 'We text you once.', 'required' => TRUE],
    ];
  }

}
```

The base class checks that every sample is valid, survives
`toElement()`→`fromElement()` unchanged, imports as this component, and
produces a JSON-safe client definition.

## 4. Optional: a custom preview

The built-in previews cover most fields. For anything special, ship a custom
element and name it in the attribute:

```php
#[FormyComponent(
  …
  preview_element: 'mymodule-phone-preview',
  library: 'mymodule/phone_preview',
)]
```

The element receives `definition` and `settings` properties on every change
(`BlockPreviewElement` in `js/src/sdk.ts`). It is rendered inert, so it is a
picture of the field, not a working input. `js/src/extensions/signature-preview.ts`
is the reference example; its library is `formy/signature_preview`.

## 5. Optional: a custom settings editor

To replace the generated settings panel, implement `SettingsAccessor`:

```ts
// Types from formy/js/src/sdk.ts (copy it or import it by path; there is no
// npm package yet).
import type { SettingsAccessor, Settings } from '../../formy/js/src/sdk';

class PhoneSettings extends HTMLElement implements SettingsAccessor {
  private onChange: (s: Settings) => void = () => {};
  private settings: Settings = {};

  writeValue(settings: Settings): void {
    this.settings = settings;
    // update your inputs from settings
  }

  registerOnChange(fn: (s: Settings) => void): void {
    this.onChange = fn;
  }

  // call this.onChange({ ...this.settings, label: 'New' }) when the user edits
}
customElements.define('mymodule-phone-settings', PhoneSettings);
```

Name it with `settings_editor: 'mymodule-phone-settings'`. Always pass the
**complete** settings to the change callback. The server still validates
them against the schema.

## Checklist

- [ ] The ID is final; it is stored in documents.
- [ ] `toElement()` omits empty values.
- [ ] `fromElement()` returns `NULL` for anything it cannot represent exactly.
- [ ] A test extends `FormyComponentTestBase` with at least two samples,
      including one with every setting filled.
- [ ] If the component adds TypeScript, `npm run build` was run and `js/dist`
      is committed.
