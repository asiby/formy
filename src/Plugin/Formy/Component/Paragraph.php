<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\MarkupComponentBase;

/**
 * A paragraph of text. In the editor, any line you type becomes one.
 */
#[FormyComponent(
  id: 'paragraph',
  label: new TranslatableMarkup('Text'),
  description: new TranslatableMarkup('A paragraph of text'),
  category: new TranslatableMarkup('Content'),
  icon: 'text-block',
  element_types: ['webform_markup'],
  preview: 'paragraph',
  weight: 31,
)]
final class Paragraph extends MarkupComponentBase {

  protected function tag(): string {
    return 'p';
  }

}
