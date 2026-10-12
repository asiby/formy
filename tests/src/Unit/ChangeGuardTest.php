<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit;

use Drupal\formy\Document\ChangeGuard;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\formy\Document\ChangeGuard
 * @group formy
 */
final class ChangeGuardTest extends UnitTestCase {

  private const OLD = [
    'intro' => ['#type' => 'webform_markup', '#markup' => '<p>Hi</p>'],
    'name' => ['#type' => 'textfield', '#title' => 'Name'],
    'choice' => ['#type' => 'radios', '#options' => ['a' => 'A']],
    'box' => [
      '#type' => 'fieldset',
      'inner' => ['#type' => 'email'],
    ],
  ];

  public function testReorderingAndRelabellingAreAllowed(): void {
    $new = array_reverse(self::OLD, TRUE);
    $new['name']['#title'] = 'Full name';
    $this->assertSame([], ChangeGuard::check(self::OLD, $new));
  }

  public function testContentBlocksMayBeRemoved(): void {
    $new = self::OLD;
    unset($new['intro']);
    $this->assertSame([], ChangeGuard::check(self::OLD, $new));
  }

  public function testQuestionsWithAnswersMayNotBeRemoved(): void {
    $new = self::OLD;
    unset($new['name'], $new['box']);
    $this->assertSame(['name', 'inner'], array_column(ChangeGuard::check(self::OLD, $new), 'path'));
  }

  public function testTypeChangesAreBlockedUnlessCompatible(): void {
    $new = self::OLD;
    $new['name']['#type'] = 'textarea';
    $new['choice']['#type'] = 'select';
    $violations = ChangeGuard::check(self::OLD, $new);
    $this->assertSame(['name'], array_column($violations, 'path'));
    $this->assertStringContainsString('type cannot change', $violations[0]['message']);
  }

}
