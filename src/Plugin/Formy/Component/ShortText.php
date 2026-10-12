<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\QuestionComponentBase;

/**
 * A one-line text answer.
 */
#[FormyComponent(
  id: 'short_text',
  label: new TranslatableMarkup('Short answer'),
  description: new TranslatableMarkup('A single line of text'),
  icon: 'text',
  element_types: ['textfield'],
  preview: 'text',
  weight: 0,
)]
final class ShortText extends QuestionComponentBase {

  protected function elementType(): string {
    return 'textfield';
  }

  protected function extraSettingsSchema(): array {
    return [
      'placeholder' => [
        'type' => 'string',
        'title' => $this->t('Placeholder'),
        'maxLength' => 255,
      ],
      'maxLength' => [
        'type' => 'integer',
        'title' => $this->t('Maximum length'),
        'min' => 1,
        'group' => 'advanced',
      ],
    ];
  }

  protected function extraToElement(array $settings): array {
    return [
      '#placeholder' => $settings['placeholder'] ?? '',
      '#maxlength' => $settings['maxLength'] ?? NULL,
    ];
  }

  protected function extraFromElement(array $element): ?array {
    $placeholder = static::readString($element, '#placeholder');
    $max_length = $element['#maxlength'] ?? NULL;
    if ($placeholder === NULL || ($max_length !== NULL && !is_int($max_length))) {
      return NULL;
    }
    return ['placeholder' => $placeholder, 'maxLength' => $max_length];
  }

}
