<?php

declare(strict_types=1);

namespace Drupal\formy\Document;

/**
 * Validates component settings against a component's settings schema.
 *
 * Pure PHP (no Drupal services) so it is fast to unit test.
 *
 * @see \Drupal\formy\Plugin\FormyComponentInterface::getSettingsSchema()
 */
final class SettingsValidator {

  /**
   * Returns the empty value for a schema type.
   */
  public static function emptyValue(string $type): mixed {
    return match ($type) {
      'boolean' => FALSE,
      'integer' => NULL,
      'options' => [],
      default => '',
    };
  }

  /**
   * Validates settings.
   *
   * @return array<int, array{property: string, message: string}>
   *   Violations; empty when valid.
   */
  public static function validate(array $schema, array $settings): array {
    $violations = [];
    $add = static function (string $property, string $message) use (&$violations): void {
      $violations[] = ['property' => $property, 'message' => $message];
    };

    foreach (array_diff_key($settings, $schema) as $name => $value) {
      $add((string) $name, 'Unknown setting.');
    }

    foreach ($schema as $name => $property) {
      $type = $property['type'] ?? 'string';
      $value = $settings[$name] ?? self::emptyValue($type);
      $required = !empty($property['required']);

      switch ($type) {
        case 'string':
        case 'text':
          if (!is_string($value)) {
            $add($name, 'Must be text.');
            break;
          }
          if ($required && trim($value) === '') {
            $add($name, 'This cannot be empty.');
          }
          if (isset($property['maxLength']) && mb_strlen($value) > $property['maxLength']) {
            $add($name, sprintf('Must be at most %d characters.', $property['maxLength']));
          }
          if ($type === 'string' && str_contains($value, "\n")) {
            $add($name, 'Must be a single line.');
          }
          break;

        case 'boolean':
          if (!is_bool($value)) {
            $add($name, 'Must be true or false.');
          }
          break;

        case 'integer':
          if ($value === NULL) {
            if ($required) {
              $add($name, 'This cannot be empty.');
            }
            break;
          }
          if (!is_int($value)) {
            $add($name, 'Must be a whole number.');
            break;
          }
          if (isset($property['min']) && $value < $property['min']) {
            $add($name, sprintf('Must be at least %d.', $property['min']));
          }
          if (isset($property['max']) && $value > $property['max']) {
            $add($name, sprintf('Must be at most %d.', $property['max']));
          }
          break;

        case 'enum':
          if (!is_string($value) || !array_key_exists($value, $property['enum'] ?? [])) {
            $add($name, 'Must be one of the listed choices.');
          }
          break;

        case 'options':
          foreach (self::validateOptions($value, (int) ($property['minItems'] ?? 0)) as $message) {
            $add($name, $message);
          }
          break;

        default:
          $add($name, sprintf('Unsupported setting type "%s".', $type));
      }
    }

    return $violations;
  }

  /**
   * Validates an options list: [['value' => 'a', 'label' => 'A'], ...].
   *
   * @return string[]
   *   Error messages.
   */
  private static function validateOptions(mixed $options, int $min_items): array {
    if (!is_array($options) || !array_is_list($options)) {
      return ['Must be a list of choices.'];
    }
    if (count($options) < $min_items) {
      return [sprintf('Add at least %d choice(s).', $min_items)];
    }
    $errors = [];
    $seen = [];
    foreach ($options as $i => $option) {
      $value = $option['value'] ?? NULL;
      $label = $option['label'] ?? NULL;
      if (!is_array($option) || !is_string($value) || !is_string($label) || array_diff_key($option, ['value' => 0, 'label' => 0])) {
        $errors[] = sprintf('Choice %d is malformed.', $i + 1);
        continue;
      }
      if (trim($value) === '' || trim($label) === '') {
        $errors[] = sprintf('Choice %d needs a label.', $i + 1);
      }
      if (isset($seen[$value])) {
        $errors[] = sprintf('Choice %d repeats the value "%s".', $i + 1, $value);
      }
      $seen[$value] = TRUE;
    }
    return $errors;
  }

}
