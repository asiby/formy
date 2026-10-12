<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit\Component;

use Drupal\formy\Plugin\Formy\Component\Paragraph;
use Drupal\Tests\formy\Unit\FormyComponentTestBase;
use PHPUnit\Framework\Attributes\Group;

#[Group('formy')]
final class ParagraphTest extends FormyComponentTestBase {

  protected function componentClass(): string {
    return Paragraph::class;
  }

  protected function sampleSettings(): array {
    return [
      ['text' => 'Please answer every question.'],
      ['text' => 'Prices in CAD & taxes < 15%'],
    ];
  }

}
