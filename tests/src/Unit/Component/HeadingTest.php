<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\Heading;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;

/**
 * @coversDefaultClass \Drupal\formy\Plugin\Formy\Component\Heading
 * @group formy
 */
final class HeadingTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return Heading::class;
  }

  protected function sampleSettings(): array {
    return [
      ['text' => 'About you'],
      ['text' => 'Q&A: <tags> stay "plain" & it\'s fine'],
    ];
  }

}
