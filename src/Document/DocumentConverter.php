<?php

declare(strict_types=1);

namespace Drupal\formy\Document;

use Drupal\formy\Plugin\ComponentRegistryInterface;

/**
 * Converts between Webform elements and Formy documents.
 *
 * A Formy document is what the editor edits:
 * @code
 * [
 *   'version' => 1,
 *   'blocks' => [
 *     ['id' => 'b_full_name', 'type' => 'short_text', 'key' => 'full_name',
 *      'settings' => ['label' => 'Full name', 'help' => '', ...]],
 *     ...
 *   ],
 * ]
 * @endcode
 *
 * The webform's elements stay the source of truth: a document is produced
 * by import() every time the editor loads, and compile() turns it back into
 * elements on save. Nothing else is stored.
 *
 * Trust model: settings come from the browser and are validated by each
 * component. Anything the editor cannot represent (unknown element
 * properties, whole "advanced" elements) is never sent to or accepted from
 * the browser. On save it is re-read from the webform's current elements, by
 * key. An editor can therefore move or remove an advanced field, but never
 * inject arbitrary element properties.
 */
final class DocumentConverter {

  /**
   * Current document format version.
   */
  public const VERSION = 1;

  /**
   * Block type for elements no component can represent.
   */
  public const ADVANCED = '_advanced';

  /**
   * Allowed element keys (Webform's own rule, with a length limit).
   */
  public const KEY_PATTERN = '/^[a-z][a-z0-9_]{0,63}$/';

  public function __construct(
    private readonly ComponentRegistryInterface $registry,
  ) {}

  /**
   * Builds a document from a webform's elements.
   */
  public function import(array $elements): array {
    $blocks = [];
    foreach ($this->analyze($elements) as $analysis) {
      $blocks[] = $analysis['block'];
    }
    return ['version' => self::VERSION, 'blocks' => $blocks];
  }

  /**
   * Validates a document's structure and every block's settings.
   *
   * @return array<int, array{path: string, message: string}>
   *   Violations; empty when valid.
   */
  public function validate(array $document): array {
    $violations = [];
    $add = static function (string $path, string $message) use (&$violations): void {
      $violations[] = ['path' => $path, 'message' => $message];
    };

    if (($document['version'] ?? NULL) !== self::VERSION) {
      $add('version', sprintf('Unsupported document version; expected %d.', self::VERSION));
    }
    $blocks = $document['blocks'] ?? NULL;
    if (!is_array($blocks) || !array_is_list($blocks)) {
      $add('blocks', 'Must be a list of blocks.');
      return $violations;
    }

    $ids = [];
    $keys = [];
    foreach ($blocks as $i => $block) {
      $path = "blocks.$i";
      if (!is_array($block)) {
        $add($path, 'Must be a block.');
        continue;
      }
      $id = $block['id'] ?? NULL;
      $type = $block['type'] ?? NULL;
      $key = $block['key'] ?? NULL;
      $settings = $block['settings'] ?? NULL;

      if (!is_string($id) || $id === '') {
        $add("$path.id", 'Missing block id.');
      }
      elseif (isset($ids[$id])) {
        $add("$path.id", 'Duplicate block id.');
      }
      else {
        $ids[$id] = TRUE;
      }

      if (!is_string($key) || !preg_match(self::KEY_PATTERN, $key)) {
        $add("$path.key", 'Keys use lowercase letters, digits and underscores, and start with a letter.');
      }
      elseif (isset($keys[$key])) {
        $add("$path.key", sprintf('The key "%s" is used twice.', $key));
      }
      else {
        $keys[$key] = TRUE;
      }

      if (!is_array($settings) || ($settings !== [] && array_is_list($settings))) {
        $add("$path.settings", 'Must be a settings object.');
        continue;
      }

      if ($type === self::ADVANCED) {
        continue;
      }
      $component = is_string($type) ? $this->registry->getComponent($type) : NULL;
      if ($component === NULL) {
        $add("$path.type", sprintf('Unknown component "%s".', is_string($type) ? $type : gettype($type)));
        continue;
      }
      foreach ($component->validateSettings($settings) as $violation) {
        $add("$path.settings.{$violation['property']}", $violation['message']);
      }
    }
    return $violations;
  }

  /**
   * Builds webform elements from a document.
   *
   * @param array $document
   *   The document sent by the editor.
   * @param array $current_elements
   *   The webform's elements as currently saved. Advanced fields and element
   *   properties the editor does not know about are taken from here.
   *
   * @throws \Drupal\formy\Document\InvalidDocumentException
   */
  public function compile(array $document, array $current_elements = []): array {
    $violations = $this->validate($document);
    if ($violations) {
      throw new InvalidDocumentException($violations);
    }

    $current = [];
    foreach ($this->analyze($current_elements) as $key => $analysis) {
      $current[$key] = $analysis;
    }

    // Root-level properties (rare) are kept as they are.
    $elements = ElementTools::properties($current_elements);
    foreach ($document['blocks'] as $i => $block) {
      $key = $block['key'];
      $type = $block['type'];

      if ($type === self::ADVANCED) {
        if (($current[$key]['block']['type'] ?? NULL) !== self::ADVANCED) {
          $violations[] = ['path' => "blocks.$i", 'message' => 'Advanced fields can be moved or removed here, but not created or changed.'];
          continue;
        }
        $elements[$key] = $current[$key]['element'];
        continue;
      }

      $element = $this->registry->getComponent($type)->toElement($block['settings']);
      // Keep properties the component does not manage, e.g. '#title_display'
      // set in Webform's own UI, but only for the same component type.
      if (($current[$key]['block']['type'] ?? NULL) === $type) {
        $element += $current[$key]['extra'];
      }
      $elements[$key] = $element;
    }

    if ($violations) {
      throw new InvalidDocumentException($violations);
    }
    return $elements;
  }

  /**
   * Imports each top-level element, keyed by element key.
   *
   * @return array<string, array{block: array, extra: array, element: array}>
   *   - block: the public document block.
   *   - extra: element properties the component does not manage.
   *   - element: the original element.
   */
  private function analyze(array $elements): array {
    $result = [];
    foreach (ElementTools::children($elements) as $key => $element) {
      if (!is_array($element)) {
        continue;
      }
      $result[(string) $key] = $this->analyzeElement((string) $key, $element);
    }
    return $result;
  }

  /**
   * Finds the first component that represents an element without loss.
   */
  private function analyzeElement(string $key, array $element): array {
    $type = $element['#type'] ?? NULL;
    $has_children = ElementTools::children($element) !== [];

    if (is_string($type) && !$has_children) {
      foreach ($this->registry->getComponentsForElementType($type) as $component) {
        $settings = $component->fromElement($element);
        if ($settings === NULL || $component->validateSettings($settings) !== []) {
          continue;
        }
        $generated = $component->toElement($settings);
        if (!self::isSubsetOf($generated, $element)) {
          // The component would change the element; not a faithful import.
          continue;
        }
        return [
          'block' => [
            'id' => 'b_' . $key,
            'type' => $component->getPluginId(),
            'key' => $key,
            'settings' => $settings,
          ],
          'extra' => array_diff_key(ElementTools::properties($element), $generated),
          'element' => $element,
        ];
      }
    }

    return [
      'block' => [
        'id' => 'b_' . $key,
        'type' => self::ADVANCED,
        'key' => $key,
        'settings' => [
          'title' => is_string($element['#title'] ?? NULL) ? $element['#title'] : $key,
          'elementType' => is_string($type) ? $type : 'container',
        ],
      ],
      'extra' => [],
      'element' => $element,
    ];
  }

  /**
   * TRUE if every property in $generated exists in $element, identically.
   */
  private static function isSubsetOf(array $generated, array $element): bool {
    foreach ($generated as $property => $value) {
      if (!array_key_exists($property, $element) || $element[$property] !== $value) {
        return FALSE;
      }
    }
    return TRUE;
  }

}
