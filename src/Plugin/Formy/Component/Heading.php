<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\MarkupComponentBase;

/**
 * A section heading. In the editor this is a normal heading line.
 */
#[FormyComponent(
  id: 'heading',
  label: new TranslatableMarkup('Heading'),
  description: new TranslatableMarkup('A section title'),
  category: new TranslatableMarkup('Content'),
  icon: 'heading',
  element_types: ['webform_markup'],
  preview: 'heading',
  weight: 30,
)]
final class Heading extends MarkupComponentBase {

  protected function tag(): string {
    return 'h2';
  }

}
