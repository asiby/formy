<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\QuestionComponentBase;

/**
 * A drawn signature, stored by Webform's own signature element.
 *
 * Also the reference example of the extension mechanism: its canvas preview
 * is a custom element (formy-signature-preview) shipped in its own library.
 */
#[FormyComponent(
  id: 'signature',
  label: new TranslatableMarkup('Signature'),
  description: new TranslatableMarkup('Sign with a finger or mouse'),
  category: new TranslatableMarkup('Advanced'),
  icon: 'signature',
  element_types: ['webform_signature'],
  preview: 'signature',
  preview_element: 'formy-signature-preview',
  library: 'formy/signature_preview',
  weight: 20,
)]
final class Signature extends QuestionComponentBase {

  protected function elementType(): string {
    return 'webform_signature';
  }

}
