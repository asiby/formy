<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\QuestionComponentBase;

/**
 * A whole number, optionally within a range.
 */
#[FormyComponent(
  id: 'number',
  label: new TranslatableMarkup('Number'),
  description: new TranslatableMarkup('A whole number'),
  icon: 'hash',
  element_types: ['number'],
  preview: 'number',
  weight: 3,
)]
final class Number extends QuestionComponentBase {

  protected function elementType(): string {
    return 'number';
  }

  protected function extraSettingsSchema(): array {
    return [
      'min' => [
        'type' => 'integer',
        'title' => $this->t('Smallest allowed'),
        'group' => 'advanced',
      ],
      'max' => [
        'type' => 'integer',
        'title' => $this->t('Largest allowed'),
        'group' => 'advanced',
      ],
    ];
  }

  public function validateSettings(array $settings): array {
    $violations = parent::validateSettings($settings);
    $min = $settings['min'] ?? NULL;
    $max = $settings['max'] ?? NULL;
    if (is_int($min) && is_int($max) && $min > $max) {
      $violations[] = ['property' => 'max', 'message' => 'Must be at least the smallest allowed value.'];
    }
    return $violations;
  }

  public function toElement(array $settings): array {
    // The parent drops empty values, which would lose a limit of 0, so the
    // limits are added here and only NULL means "no limit".
    return parent::toElement($settings) + array_filter([
      '#min' => $settings['min'] ?? NULL,
      '#max' => $settings['max'] ?? NULL,
    ], static fn(mixed $value): bool => $value !== NULL);
  }

  protected function extraFromElement(array $element): ?array {
    $min = $element['#min'] ?? NULL;
    $max = $element['#max'] ?? NULL;
    if (($min !== NULL && !is_int($min)) || ($max !== NULL && !is_int($max))) {
      return NULL;
    }
    return ['min' => $min, 'max' => $max];
  }

}
