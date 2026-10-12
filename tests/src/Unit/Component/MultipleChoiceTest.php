<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\MultipleChoice;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;

/**
 * @coversDefaultClass \Drupal\formy\Plugin\Formy\Component\MultipleChoice
 * @group formy
 */
final class MultipleChoiceTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return MultipleChoice::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Dietary needs', 'help' => 'Pick all that apply.', 'required' => FALSE, 'options' => [['value' => 'vegan', 'label' => 'Vegan'], ['value' => 'halal', 'label' => 'Halal']]],
    ];
  }

}
