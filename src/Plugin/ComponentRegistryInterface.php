<?php

declare(strict_types=1);

namespace Drupal\formy\Plugin;

/**
 * Lookup of Formy components.
 *
 * Implemented by FormyComponentManager in Drupal, and by simple in-memory
 * registries in unit tests, so the document logic never depends on Drupal's
 * service container.
 */
interface ComponentRegistryInterface {

  /**
   * Returns the component with this ID, or NULL if none is registered.
   */
  public function getComponent(string $id): ?FormyComponentInterface;

  /**
   * Returns the components that may import an element type, best first.
   *
   * @return \Drupal\formy\Plugin\FormyComponentInterface[]
   *   Ordered by weight (lowest first).
   */
  public function getComponentsForElementType(string $element_type): array;

  /**
   * Returns every component, ordered for the "/" menu.
   *
   * @return \Drupal\formy\Plugin\FormyComponentInterface[]
   *   Keyed by component ID.
   */
  public function getAllComponents(): array;

}
