<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\Number;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;

/**
 * @coversDefaultClass \Drupal\formy\Plugin\Formy\Component\Number
 * @group formy
 */
final class NumberTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return Number::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Guests', 'help' => '', 'required' => FALSE, 'min' => NULL, 'max' => NULL],
      ['label' => 'Guests', 'help' => '', 'required' => TRUE, 'min' => 0, 'max' => 10],
      ['label' => 'Offset', 'help' => '', 'required' => FALSE, 'min' => -5, 'max' => NULL],
    ];
  }

}
