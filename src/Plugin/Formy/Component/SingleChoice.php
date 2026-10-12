<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin\Formy\Component;

use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\ChoiceComponentBase;

/**
 * Pick one choice, shown as radio buttons or a dropdown.
 *
 * One component, two element types: the "display" setting chooses between
 * Webform's radios and select elements.
 */
#[FormyComponent(
  id: 'single_choice',
  label: new TranslatableMarkup('Single choice'),
  description: new TranslatableMarkup('Pick one option'),
  category: new TranslatableMarkup('Choices'),
  icon: 'radio',
  element_types: ['radios', 'select'],
  preview: 'radios',
  weight: 10,
)]
final class SingleChoice extends ChoiceComponentBase {

  protected function elementType(): string {
    return 'radios';
  }

  protected function extraSettingsSchema(): array {
    return parent::extraSettingsSchema() + [
      'display' => [
        'type' => 'enum',
        'title' => $this->t('Show as'),
        'enum' => [
          'radios' => $this->t('Radio buttons'),
          'dropdown' => $this->t('Dropdown'),
        ],
        'default' => 'radios',
      ],
    ];
  }

  public function toElement(array $settings): array {
    $element = parent::toElement($settings);
    if (($settings['display'] ?? 'radios') === 'dropdown') {
      $element['#type'] = 'select';
    }
    return $element;
  }

  public function fromElement(array $element): ?array {
    $type = $element['#type'] ?? NULL;
    if ($type === 'select' && !empty($element['#multiple'])) {
      return NULL;
    }
    if ($type !== 'radios' && $type !== 'select') {
      return NULL;
    }
    // Let the parent read the shared settings as if it were radios.
    $settings = parent::fromElement(['#type' => 'radios'] + $element);
    if ($settings === NULL) {
      return NULL;
    }
    $settings['display'] = $type === 'select' ? 'dropdown' : 'radios';
    return $settings;
  }

}
