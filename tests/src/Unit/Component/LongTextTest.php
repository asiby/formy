<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\LongText;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;
use PHPUnit\Framework\Attributes\Group;

#[Group('formy')]
final class LongTextTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return LongText::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Comments', 'help' => '', 'required' => FALSE, 'placeholder' => '', 'rows' => NULL],
      ['label' => 'Tell us more', 'help' => 'Optional', 'required' => TRUE, 'placeholder' => 'Type here', 'rows' => 6],
    ];
  }

}
