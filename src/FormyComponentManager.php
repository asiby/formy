<?php

declare(strict_types=1);

namespace Drupal\formy;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\DefaultPluginManager;
use Drupal\formy\Attribute\FormyComponent;
use Drupal\formy\Plugin\ComponentRegistryInterface;
use Drupal\formy\Plugin\FormyComponentInterface;

/**
 * Discovers Formy components in any module's src/Plugin/Formy/Component.
 *
 * Other modules can alter definitions with
 * hook_formy_component_info_alter(array &$definitions).
 */
class FormyComponentManager extends DefaultPluginManager implements ComponentRegistryInterface {

  /**
   * Instantiated components, keyed by ID.
   *
   * @var \Drupal\formy\Plugin\FormyComponentInterface[]
   */
  protected array $instances = [];

  public function __construct(\Traversable $namespaces, CacheBackendInterface $cache_backend, ModuleHandlerInterface $module_handler) {
    parent::__construct(
      'Plugin/Formy/Component',
      $namespaces,
      $module_handler,
      FormyComponentInterface::class,
      FormyComponent::class,
    );
    $this->alterInfo('formy_component_info');
    $this->setCacheBackend($cache_backend, 'formy_component_plugins');
  }

  /**
   * {@inheritdoc}
   */
  public function getComponent(string $id): ?FormyComponentInterface {
    if (!isset($this->instances[$id])) {
      if (!$this->hasDefinition($id)) {
        return NULL;
      }
      $this->instances[$id] = $this->createInstance($id);
    }
    return $this->instances[$id];
  }

  /**
   * {@inheritdoc}
   */
  public function getComponentsForElementType(string $element_type): array {
    $components = [];
    foreach ($this->getSortedDefinitions() as $id => $definition) {
      if (in_array($element_type, $definition['element_types'] ?? [], TRUE)) {
        $components[] = $this->getComponent($id);
      }
    }
    return $components;
  }

  /**
   * {@inheritdoc}
   */
  public function getAllComponents(): array {
    $components = [];
    foreach (array_keys($this->getSortedDefinitions()) as $id) {
      $components[$id] = $this->getComponent($id);
    }
    return $components;
  }

  /**
   * Returns definitions ordered by weight, then label.
   */
  protected function getSortedDefinitions(): array {
    $definitions = $this->getDefinitions();
    uasort($definitions, static fn(array $a, array $b): int =>
      [$a['weight'] ?? 0, (string) $a['label']] <=> [$b['weight'] ?? 0, (string) $b['label']]
    );
    return $definitions;
  }

}
