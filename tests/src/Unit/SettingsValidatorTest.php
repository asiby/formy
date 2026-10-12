<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit;

use Drupal\formy\Document\SettingsValidator;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\formy\Document\SettingsValidator
 * @group formy
 */
final class SettingsValidatorTest extends UnitTestCase {

  private const SCHEMA = [
    'label' => ['type' => 'string', 'required' => TRUE, 'maxLength' => 5],
    'help' => ['type' => 'text'],
    'on' => ['type' => 'boolean'],
    'count' => ['type' => 'integer', 'min' => 1, 'max' => 3],
    'mode' => ['type' => 'enum', 'enum' => ['a' => 'A', 'b' => 'B'], 'default' => 'a'],
    'choices' => ['type' => 'options', 'minItems' => 1],
  ];

  private function messages(array $settings): array {
    $out = [];
    foreach (SettingsValidator::validate(self::SCHEMA, $settings) as $violation) {
      $out[$violation['property']][] = $violation['message'];
    }
    return $out;
  }

  private function valid(): array {
    return [
      'label' => 'Hi',
      'help' => "Line 1\nLine 2",
      'on' => TRUE,
      'count' => NULL,
      'mode' => 'b',
      'choices' => [['value' => 'x', 'label' => 'X']],
    ];
  }

  public function testValidSettingsPass(): void {
    $this->assertSame([], $this->messages($this->valid()));
  }

  public function testStrings(): void {
    $this->assertSame(['label' => ['This cannot be empty.']], $this->messages(['label' => '  '] + $this->valid()));
    $this->assertSame(['label' => ['Must be at most 5 characters.']], $this->messages(['label' => 'Too long'] + $this->valid()));
    $this->assertSame(['label' => ['Must be a single line.']], $this->messages(['label' => "a\nb"] + $this->valid()));
    $this->assertSame(['label' => ['Must be text.']], $this->messages(['label' => 5] + $this->valid()));
  }

  public function testScalars(): void {
    $this->assertSame(['on' => ['Must be true or false.']], $this->messages(['on' => 1] + $this->valid()));
    $this->assertSame(['count' => ['Must be at least 1.']], $this->messages(['count' => 0] + $this->valid()));
    $this->assertSame(['count' => ['Must be at most 3.']], $this->messages(['count' => 4] + $this->valid()));
    $this->assertSame(['count' => ['Must be a whole number.']], $this->messages(['count' => '2'] + $this->valid()));
    $this->assertSame(['mode' => ['Must be one of the listed choices.']], $this->messages(['mode' => 'c'] + $this->valid()));
  }

  public function testOptions(): void {
    $this->assertSame(['choices' => ['Add at least 1 choice(s).']], $this->messages(['choices' => []] + $this->valid()));
    $this->assertSame(['choices' => ['Choice 2 repeats the value "x".']], $this->messages(['choices' => [
      ['value' => 'x', 'label' => 'X'],
      ['value' => 'x', 'label' => 'Y'],
    ]] + $this->valid()));
    $this->assertSame(['choices' => ['Choice 1 is malformed.']], $this->messages(['choices' => [
      ['value' => 'x', 'label' => 'X', '#markup' => 'boo'],
    ]] + $this->valid()));
    $this->assertSame(['choices' => ['Must be a list of choices.']], $this->messages(['choices' => ['a' => ['value' => 'x', 'label' => 'X']]] + $this->valid()));
  }

  public function testUnknownAndMissingSettings(): void {
    $this->assertSame(['extra' => ['Unknown setting.']], $this->messages(['extra' => 1] + $this->valid()));
    // Missing settings fall back to their empty value.
    $settings = $this->valid();
    unset($settings['help'], $settings['on']);
    $this->assertSame([], $this->messages($settings));
  }

}
