<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit;

use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\ComponentRegistryInterface;
use Drupal\formy\Plugin\FormyComponentInterface;

/**
 * An in-memory component registry for unit tests.
 *
 * Reads each class's #[FormyComponent] attribute, exactly like plugin
 * discovery does, so tests use the real definitions.
 */
final class TestRegistry implements ComponentRegistryInterface {

  /**
   * @var \Drupal\formy\Plugin\FormyComponentInterface[]
   */
  private array $components = [];

  /**
   * @param class-string[] $classes
   *   Component classes to register.
   */
  public function __construct(array $classes) {
    foreach ($classes as $class) {
      $attributes = (new \ReflectionClass($class))->getAttributes(FormyComponent::class);
      if (!$attributes) {
        throw new \LogicException("$class has no #[FormyComponent] attribute.");
      }
      $attribute = $attributes[0]->newInstance();
      // Discovery sets these before reading the definition.
      $attribute->setClass($class);
      $attribute->setProvider('formy');
      $definition = $attribute->get();
      $this->components[$definition['id']] = new $class([], $definition['id'], $definition);
    }
    uasort($this->components, static fn(FormyComponentInterface $a, FormyComponentInterface $b): int =>
      ($a->getPluginDefinition()['weight'] ?? 0) <=> ($b->getPluginDefinition()['weight'] ?? 0)
    );
  }

  /**
   * A registry with every component this module ships.
   */
  public static function core(): self {
    $classes = [];
    foreach (glob(dirname(__DIR__, 3) . '/src/Plugin/Formy/Component/*.php') as $file) {
      $classes[] = 'Drupal\\formy\\Plugin\\Formy\\Component\\' . basename($file, '.php');
    }
    return new self($classes);
  }

  public function getComponent(string $id): ?FormyComponentInterface {
    return $this->components[$id] ?? NULL;
  }

  public function getComponentsForElementType(string $element_type): array {
    return array_values(array_filter(
      $this->components,
      static fn(FormyComponentInterface $c): bool => in_array($element_type, $c->getPluginDefinition()['element_types'] ?? [], TRUE),
    ));
  }

  public function getAllComponents(): array {
    return $this->components;
  }

}
