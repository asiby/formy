<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin;

use Drupal\formy\Document\ElementTools;

/**
 * Base class for content blocks (headings, paragraphs) stored as markup.
 *
 * The editor stores plain text; this class wraps it in one HTML tag inside a
 * webform_markup element, escaping it. Markup written elsewhere that is more
 * than "<tag>plain text</tag>" is not imported and stays an advanced field.
 */
abstract class MarkupComponentBase extends FormyComponentBase {

  /**
   * The HTML tag that wraps the text, e.g. 'h2' or 'p'.
   */
  abstract protected function tag(): string;

  /**
   * {@inheritdoc}
   */
  public function getSettingsSchema(): array {
    return [
      'text' => [
        'type' => 'string',
        'title' => $this->t('Text'),
        'required' => TRUE,
        'maxLength' => 5000,
        'inline' => TRUE,
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function toElement(array $settings): array {
    $tag = $this->tag();
    return [
      '#type' => 'webform_markup',
      '#markup' => "<$tag>" . ElementTools::escapeText($settings['text'] ?? '') . "</$tag>",
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function fromElement(array $element): ?array {
    $markup = $element['#markup'] ?? NULL;
    if (($element['#type'] ?? NULL) !== 'webform_markup' || !is_string($markup)) {
      return NULL;
    }
    $tag = $this->tag();
    if (!preg_match("#^<$tag>(.*)</$tag>$#s", $markup, $matches)) {
      return NULL;
    }
    $text = ElementTools::unescapeText($matches[1]);
    return $text === NULL ? NULL : ['text' => $text];
  }

}
