<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit;

use Drupal\formy\Document\DocumentConverter;
use Drupal\formy\Plugin\FormyComponentInterface;

/**
 * Free tests for any Formy component. Extend it and list sample settings.
 *
 * @code
 * final class ShortTextTest extends FormyComponentTestBase {
 *   protected function componentClass(): string { return ShortText::class; }
 *   protected function sampleSettings(): array {
 *     return [['label' => 'Name', 'help' => '', 'required' => TRUE, ...]];
 *   }
 * }
 * @endcode
 *
 * For every sample it checks that the settings are valid, that
 * toElement() and fromElement() are inverses, and that a webform holding the
 * element opens in Formy as this component (not as a locked advanced field).
 */
abstract class FormyComponentTestBase extends FormyUnitTestCase {

  /**
   * The component class under test.
   *
   * @return class-string<\Drupal\formy\Plugin\FormyComponentInterface>
   */
  abstract protected function componentClass(): string;

  /**
   * Complete, valid settings arrays covering the interesting cases.
   */
  abstract protected function sampleSettings(): array;

  protected function component(): FormyComponentInterface {
    $registry = new TestRegistry([$this->componentClass()]);
    return array_values($registry->getAllComponents())[0];
  }

  public function testSamplesAreValid(): void {
    $component = $this->component();
    foreach ($this->sampleSettings() as $i => $settings) {
      $this->assertSame([], $component->validateSettings($settings), "Sample $i should be valid.");
    }
  }

  public function testRoundTrip(): void {
    $component = $this->component();
    foreach ($this->sampleSettings() as $i => $settings) {
      $element = $component->toElement($settings);
      $this->assertSame($settings, $component->fromElement($element), "Sample $i should survive toElement() then fromElement().");
    }
  }

  public function testImportsAsThisComponent(): void {
    $component = $this->component();
    $converter = new DocumentConverter(new TestRegistry([$this->componentClass()]));
    foreach ($this->sampleSettings() as $i => $settings) {
      $document = $converter->import(['sample' => $component->toElement($settings)]);
      $this->assertSame($component->getPluginId(), $document['blocks'][0]['type'], "Sample $i should import as {$component->getPluginId()}.");
      $this->assertSame($settings, $document['blocks'][0]['settings']);
    }
  }

  public function testDefaultsHaveEverySetting(): void {
    $component = $this->component();
    $this->assertSame(array_keys($component->getSettingsSchema()), array_keys($component->defaultSettings()));
  }

  public function testClientDefinitionIsJsonSerializable(): void {
    $definition = $this->component()->getClientDefinition();
    $this->assertSame($definition, json_decode(json_encode($definition, JSON_THROW_ON_ERROR), TRUE));
  }

}
