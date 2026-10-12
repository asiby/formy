<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin;

use Drupal\formy\Document\ElementTools;

/**
 * Base class for components that ask a question (most of them).
 *
 * Provides the settings every question has: the label (edited on the
 * canvas), help text and "Required". A subclass only declares its element
 * type, and optionally extra settings:
 *
 * @code
 * protected function elementType(): string { return 'textfield'; }
 *
 * protected function extraSettingsSchema(): array {
 *   return ['placeholder' => ['type' => 'string', 'title' => $this->t('Placeholder')]];
 * }
 *
 * protected function extraToElement(array $settings): array {
 *   return ['#placeholder' => $settings['placeholder']];
 * }
 *
 * protected function extraFromElement(array $element): ?array {
 *   $placeholder = static::readString($element, '#placeholder');
 *   return $placeholder === NULL ? NULL : ['placeholder' => $placeholder];
 * }
 * @endcode
 */
abstract class QuestionComponentBase extends FormyComponentBase {

  /**
   * The Webform element #type this component produces.
   */
  abstract protected function elementType(): string;

  /**
   * Settings beyond label, help and required.
   */
  protected function extraSettingsSchema(): array {
    return [];
  }

  /**
   * Element properties for the extra settings (empty values are dropped).
   */
  protected function extraToElement(array $settings): array {
    return [];
  }

  /**
   * Reads the extra settings from an element.
   *
   * @return array|null
   *   NULL when the element cannot be represented.
   */
  protected function extraFromElement(array $element): ?array {
    return [];
  }

  /**
   * {@inheritdoc}
   */
  public function getSettingsSchema(): array {
    return [
      'label' => [
        'type' => 'string',
        'title' => $this->t('Question'),
        'required' => TRUE,
        'maxLength' => 255,
        'inline' => TRUE,
        'default' => '',
      ],
      'help' => [
        'type' => 'text',
        'title' => $this->t('Help text'),
        'description' => $this->t('Shown under the question.'),
        'maxLength' => 1000,
      ],
      'required' => [
        'type' => 'boolean',
        'title' => $this->t('Required'),
      ],
    ] + $this->extraSettingsSchema();
  }

  /**
   * {@inheritdoc}
   */
  public function toElement(array $settings): array {
    return ElementTools::withoutEmpty([
      '#type' => $this->elementType(),
      '#title' => $settings['label'] ?? '',
      '#description' => $settings['help'] ?? '',
      '#required' => !empty($settings['required']),
    ] + $this->extraToElement($settings));
  }

  /**
   * {@inheritdoc}
   */
  public function fromElement(array $element): ?array {
    if (($element['#type'] ?? NULL) !== $this->elementType()) {
      return NULL;
    }
    $label = static::readString($element, '#title');
    $help = static::readString($element, '#description');
    $required = $element['#required'] ?? FALSE;
    if ($label === NULL || $help === NULL || !is_bool($required)) {
      return NULL;
    }
    $extra = $this->extraFromElement($element);
    if ($extra === NULL) {
      return NULL;
    }
    return ['label' => $label, 'help' => $help, 'required' => $required] + $extra;
  }

}
