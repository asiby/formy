<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\ShortText;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;
use PHPUnit\Framework\Attributes\Group;

#[Group('formy')]
final class ShortTextTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return ShortText::class;
  }

  protected function sampleSettings(): array {
    return [
      ['label' => 'Full name', 'help' => '', 'required' => FALSE, 'placeholder' => '', 'maxLength' => NULL],
      ['label' => 'Team <b>name</b> & role', 'help' => 'As on your badge.', 'required' => TRUE, 'placeholder' => 'e.g. Ada', 'maxLength' => 80],
    ];
  }

}
