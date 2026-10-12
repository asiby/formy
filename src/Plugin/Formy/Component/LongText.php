<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\QuestionComponentBase;

/**
 * A multi-line text answer.
 */
#[FormyComponent(
  id: 'long_text',
  label: new TranslatableMarkup('Long answer'),
  description: new TranslatableMarkup('Several lines of text'),
  icon: 'paragraph',
  element_types: ['textarea'],
  preview: 'textarea',
  weight: 1,
)]
final class LongText extends QuestionComponentBase {

  protected function elementType(): string {
    return 'textarea';
  }

  protected function extraSettingsSchema(): array {
    return [
      'placeholder' => [
        'type' => 'string',
        'title' => $this->t('Placeholder'),
        'maxLength' => 255,
      ],
      'rows' => [
        'type' => 'integer',
        'title' => $this->t('Visible lines'),
        'min' => 1,
        'max' => 50,
        'group' => 'advanced',
      ],
    ];
  }

  protected function extraToElement(array $settings): array {
    return [
      '#placeholder' => $settings['placeholder'] ?? '',
      '#rows' => $settings['rows'] ?? NULL,
    ];
  }

  protected function extraFromElement(array $element): ?array {
    $placeholder = static::readString($element, '#placeholder');
    $rows = $element['#rows'] ?? NULL;
    if ($placeholder === NULL || ($rows !== NULL && !is_int($rows))) {
      return NULL;
    }
    return ['placeholder' => $placeholder, 'rows' => $rows];
  }

}
