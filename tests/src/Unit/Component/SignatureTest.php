<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\Signature;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;
use PHPUnit\Framework\Attributes\Group;

#[Group('formy')]
final class SignatureTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return Signature::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Sign here', 'help' => '', 'required' => TRUE],
      ['label' => 'Parent signature', 'help' => 'Required for minors.', 'required' => FALSE],
    ];
  }

}
