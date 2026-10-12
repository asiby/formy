<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\Date;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;
use PHPUnit\Framework\Attributes\Group;

#[Group('formy')]
final class DateTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return Date::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Event date', 'help' => '', 'required' => FALSE],
      ['label' => 'Start', 'help' => 'Pick a weekday.', 'required' => TRUE],
    ];
  }

}
