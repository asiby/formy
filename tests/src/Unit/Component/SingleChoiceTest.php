<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\SingleChoice;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;

/**
 * @coversDefaultClass \Drupal\formy\Plugin\Formy\Component\SingleChoice
 * @group formy
 */
final class SingleChoiceTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return SingleChoice::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Attending?', 'help' => '', 'required' => TRUE, 'options' => [['value' => 'yes', 'label' => 'Yes'], ['value' => 'no', 'label' => 'No']], 'display' => 'radios'],
      ['label' => 'Country', 'help' => '', 'required' => FALSE, 'options' => [['value' => 'ca', 'label' => 'Canada'], ['value' => '1', 'label' => 'One']], 'display' => 'dropdown'],
    ];
  }

}
