<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\Email;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;

/**
 * @coversDefaultClass \Drupal\formy\Plugin\Formy\Component\Email
 * @group formy
 */
final class EmailTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return Email::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Email', 'help' => '', 'required' => TRUE, 'placeholder' => ''],
      ['label' => 'Work email', 'help' => 'We reply here.', 'required' => FALSE, 'placeholder' => 'you@example.com'],
    ];
  }

}
