<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\QuestionComponentBase;

/**
 * A calendar date.
 */
#[FormyComponent(
  id: 'date',
  label: new TranslatableMarkup('Date'),
  description: new TranslatableMarkup('Pick a day on a calendar'),
  icon: 'calendar',
  element_types: ['date'],
  preview: 'date',
  weight: 4,
)]
final class Date extends QuestionComponentBase {

  protected function elementType(): string {
    return 'date';
  }

}
