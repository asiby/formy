<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\QuestionComponentBase;

/**
 * An email address.
 */
#[FormyComponent(
  id: 'email',
  label: new TranslatableMarkup('Email'),
  description: new TranslatableMarkup('A valid email address'),
  icon: 'mail',
  element_types: ['email'],
  preview: 'email',
  weight: 2,
)]
final class Email extends QuestionComponentBase {

  protected function elementType(): string {
    return 'email';
  }

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

}
