<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin;

use Drupal\Component\Plugin\PluginInspectionInterface;

/**
 * Contract every Formy component implements.
 *
 * A component translates between two shapes:
 * - "settings": the small, editor-friendly array the canvas edits
 *   (e.g. ['label' => 'Your name', 'required' => TRUE]);
 * - a Webform element render array (e.g. ['#type' => 'textfield',
 *   '#title' => 'Your name', '#required' => TRUE]).
 *
 * toElement() and fromElement() must be inverses for any settings the
 * component produces. FormyComponentTestBase checks this for you.
 *
 * Most components extend QuestionComponentBase or FormyComponentBase and
 * only implement getSettingsSchema(), toElement() and fromElement().
 */
interface FormyComponentInterface extends PluginInspectionInterface {

  /**
   * Describes the settings the editor shows and validates.
   *
   * @return array<string, array<string, mixed>>
   *   Keyed by setting name. Each entry:
   *   - type: string, text (multi-line), boolean, integer, enum or options.
   *   - title: label in the settings panel.
   *   - description: (optional) help under the field.
   *   - default: (optional) default value.
   *   - required: (optional) TRUE if it may not be empty.
   *   - maxLength, min, max, minItems: (optional) limits.
   *   - enum: (enum only) value => label.
   *   - group: (optional) 'main' (default) or 'advanced' (collapsed).
   *   - inline: (optional) TRUE when edited directly on the canvas (e.g. the
   *     question label). At most one setting should be inline.
   */
  public function getSettingsSchema(): array;

  /**
   * Returns the settings a freshly inserted block starts with.
   */
  public function defaultSettings(): array;

  /**
   * Validates settings against the schema and any extra rules.
   *
   * @return array<int, array{property: string, message: string}>
   *   An empty array when valid.
   */
  public function validateSettings(array $settings): array;

  /**
   * Builds the Webform element for these settings.
   *
   * Leave out properties that are empty or FALSE: an element without
   * '#required' and one with '#required' => FALSE must map to the same
   * settings, or round trips stop matching.
   */
  public function toElement(array $settings): array;

  /**
   * Reads settings from an existing Webform element.
   *
   * @return array|null
   *   The settings, or NULL if this component cannot represent the element.
   *   Returning NULL is always safe: the element is then kept untouched as a
   *   locked "advanced field" block.
   */
  public function fromElement(array $element): ?array;

  /**
   * Returns everything the editor needs to know about this component.
   *
   * @return array<string, mixed>
   *   JSON-serializable definition (see js/src/sdk.ts ComponentDefinition).
   */
  public function getClientDefinition(): array;

}
