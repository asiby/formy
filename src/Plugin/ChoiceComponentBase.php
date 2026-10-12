<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin;

/**
 * Base class for questions with a list of choices.
 *
 * In settings, choices are a list so their order is explicit:
 * [['value' => 'yes', 'label' => 'Yes'], ...]. In the Webform element they
 * become '#options' => ['yes' => 'Yes', ...].
 */
abstract class ChoiceComponentBase extends QuestionComponentBase {

  /**
   * {@inheritdoc}
   */
  protected function extraSettingsSchema(): array {
    return [
      'options' => [
        'type' => 'options',
        'title' => $this->t('Choices'),
        'minItems' => 1,
        'default' => [
          ['value' => 'option_1', 'label' => (string) $this->t('Option 1')],
          ['value' => 'option_2', 'label' => (string) $this->t('Option 2')],
        ],
      ],
    ];
  }

  /**
   * {@inheritdoc}
   */
  protected function extraToElement(array $settings): array {
    $options = [];
    foreach ($settings['options'] ?? [] as $option) {
      $options[$option['value']] = $option['label'];
    }
    return ['#options' => $options];
  }

  /**
   * {@inheritdoc}
   */
  protected function extraFromElement(array $element): ?array {
    $options = static::readOptions($element);
    return $options === NULL ? NULL : ['options' => $options];
  }

  /**
   * Reads '#options' as a list; NULL for anything but a flat value => label.
   *
   * Webform also allows predefined option sets ('#options' => 'yes_no') and
   * nested option groups; those stay locked "advanced" fields for now.
   */
  protected static function readOptions(array $element): ?array {
    $options = $element['#options'] ?? NULL;
    if (!is_array($options)) {
      return NULL;
    }
    $list = [];
    foreach ($options as $value => $label) {
      if (!is_string($label)) {
        return NULL;
      }
      $list[] = ['value' => (string) $value, 'label' => $label];
    }
    return $list;
  }

}
