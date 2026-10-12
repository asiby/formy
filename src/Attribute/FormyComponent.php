<?php

declare(strict_types=1);

namespace Drupal\formy\Attribute;

use Drupal\Component\Plugin\Attribute\Plugin;
use Drupal\Core\StringTranslation\TranslatableMarkup;

/**
 * Declares a Formy component: one kind of block editors can insert.
 *
 * Example:
 * @code
 * #[FormyComponent(
 *   id: 'short_text',
 *   label: new TranslatableMarkup('Short answer'),
 *   element_types: ['textfield'],
 *   icon: 'text',
 *   preview: 'text',
 * )]
 * final class ShortText extends QuestionComponentBase { ... }
 * @endcode
 *
 * @see \Drupal\formy\Plugin\FormyComponentInterface
 * @see docs/WRITING_A_COMPONENT.md
 */
#[\Attribute(\Attribute::TARGET_CLASS)]
final class FormyComponent extends Plugin {

  /**
   * @param string $id
   *   Machine name, also used as the block "type" in Formy documents. Never
   *   rename it once forms exist: saved documents refer to it.
   * @param \Drupal\Core\StringTranslation\TranslatableMarkup $label
   *   Name shown in the "/" menu.
   * @param \Drupal\Core\StringTranslation\TranslatableMarkup|null $description
   *   One short line shown under the label in the "/" menu.
   * @param \Drupal\Core\StringTranslation\TranslatableMarkup|null $category
   *   Group in the "/" menu. Defaults to "Questions".
   * @param string $icon
   *   Icon name understood by the editor (see js/src/ui/icons.ts).
   * @param string[] $element_types
   *   Webform element types (#type) this component can import. Used when a
   *   webform built elsewhere is opened in Formy.
   * @param string $preview
   *   Built-in preview the editor draws on the canvas: text, textarea,
   *   email, number, date, radios, checkboxes, select, signature, heading,
   *   paragraph or generic.
   * @param string|null $preview_element
   *   Optional custom element tag (e.g. 'formy-signature-preview') that
   *   replaces the built-in preview. It must be defined by $library.
   * @param string|null $settings_editor
   *   Optional custom element tag that replaces the generated settings panel.
   *   It must implement the SettingsAccessor contract (js/src/sdk.ts).
   * @param string|null $library
   *   Drupal library ('module/name') that defines the custom elements above.
   *   Attached to the editor page automatically.
   * @param int $weight
   *   Order in the "/" menu, and import priority: when several components
   *   claim the same element type, the lowest weight is tried first.
   * @param bool $insertable
   *   FALSE hides the component from the "/" menu (import-only).
   * @param string|null $deriver
   *   Plugin deriver class, if any.
   */
  public function __construct(
    public readonly string $id,
    public readonly TranslatableMarkup $label,
    public readonly ?TranslatableMarkup $description = NULL,
    public readonly ?TranslatableMarkup $category = NULL,
    public readonly string $icon = 'square',
    public readonly array $element_types = [],
    public readonly string $preview = 'generic',
    public readonly ?string $preview_element = NULL,
    public readonly ?string $settings_editor = NULL,
    public readonly ?string $library = NULL,
    public readonly int $weight = 0,
    public readonly bool $insertable = TRUE,
    public readonly ?string $deriver = NULL,
  ) {}

}
