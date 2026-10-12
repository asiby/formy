<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin;

use Drupal\Core\Plugin\PluginBase;
use Drupal\formy\Document\SettingsValidator;

/**
 * Base class for Formy components.
 *
 * Implements defaults, validation and the client definition from the
 * settings schema. Subclasses implement getSettingsSchema(), toElement() and
 * fromElement().
 */
abstract class FormyComponentBase extends PluginBase implements FormyComponentInterface {

  /**
   * {@inheritdoc}
   */
  public function defaultSettings(): array {
    $defaults = [];
    foreach ($this->getSettingsSchema() as $name => $property) {
      $defaults[$name] = $property['default'] ?? SettingsValidator::emptyValue($property['type'] ?? 'string');
    }
    return $defaults;
  }

  /**
   * {@inheritdoc}
   */
  public function validateSettings(array $settings): array {
    return SettingsValidator::validate($this->getSettingsSchema(), $settings);
  }

  /**
   * {@inheritdoc}
   */
  public function getClientDefinition(): array {
    $definition = $this->getPluginDefinition();
    $schema = [];
    foreach ($this->getSettingsSchema() as $name => $property) {
      $schema[$name] = $this->stringify($property);
    }
    return [
      'id' => $this->getPluginId(),
      'label' => (string) $definition['label'],
      'description' => (string) ($definition['description'] ?? ''),
      'category' => (string) ($definition['category'] ?? $this->t('Questions')),
      'icon' => $definition['icon'] ?? 'square',
      'preview' => $definition['preview'] ?? 'generic',
      'previewElement' => $definition['preview_element'] ?? NULL,
      'settingsEditor' => $definition['settings_editor'] ?? NULL,
      'insertable' => $definition['insertable'] ?? TRUE,
      'weight' => $definition['weight'] ?? 0,
      'schema' => $schema,
      'defaults' => $this->defaultSettings(),
    ];
  }

  /**
   * Casts translatable strings in a schema property to plain strings.
   */
  private function stringify(array $property): array {
    foreach ($property as $key => $value) {
      if ($value instanceof \Stringable) {
        $property[$key] = (string) $value;
      }
      elseif (is_array($value)) {
        $property[$key] = $this->stringify($value);
      }
    }
    return $property;
  }

  /**
   * Reads a string property from an element.
   *
   * @return string|null
   *   The value ('' when absent), or NULL when present but not a plain
   *   string, in which case the component should not import the element.
   */
  protected static function readString(array $element, string $property): ?string {
    if (!array_key_exists($property, $element)) {
      return '';
    }
    return is_string($element[$property]) ? $element[$property] : NULL;
  }

}
