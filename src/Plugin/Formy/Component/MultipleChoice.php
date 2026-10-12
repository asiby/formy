<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\ChoiceComponentBase;

/**
 * Pick any number of choices (checkboxes).
 */
#[FormyComponent(
  id: 'multiple_choice',
  label: new TranslatableMarkup('Checkboxes'),
  description: new TranslatableMarkup('Pick one or more options'),
  category: new TranslatableMarkup('Choices'),
  icon: 'checkbox',
  element_types: ['checkboxes'],
  preview: 'checkboxes',
  weight: 11,
)]
final class MultipleChoice extends ChoiceComponentBase {

  protected function elementType(): string {
    return 'checkboxes';
  }

}
