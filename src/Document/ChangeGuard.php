<?php

declare(strict_types=1);

namespace Drupal\formy\Document;

/**
 * Stops edits that would orphan existing responses.
 *
 * Once a webform has submissions, a question that holds answers may not be
 * removed, and may not change its element type (its stored values would no
 * longer match). Renaming labels, editing help text and reordering are
 * always fine.
 */
final class ChangeGuard {

  /**
   * Element types that store values the same way, so switching is safe.
   */
  private const COMPATIBLE = [
    ['radios', 'select'],
  ];

  /**
   * Compares old and new elements of a webform that has submissions.
   *
   * @return array<int, array{path: string, message: string}>
   *   Violations, with the element key as path.
   */
  public static function check(array $old_elements, array $new_elements): array {
    $old = ElementTools::flattenTypes($old_elements);
    $new = ElementTools::flattenTypes($new_elements);
    $violations = [];
    foreach ($old as $key => $type) {
      if ($type === NULL || in_array($type, ElementTools::NON_INPUT_TYPES, TRUE)) {
        continue;
      }
      if (!array_key_exists($key, $new)) {
        $violations[] = [
          'path' => $key,
          'message' => 'This question already has responses, so it cannot be removed.',
        ];
      }
      elseif ($new[$key] !== $type && !self::compatible($type, $new[$key])) {
        $violations[] = [
          'path' => $key,
          'message' => 'This question already has responses, so its type cannot change.',
        ];
      }
    }
    return $violations;
  }

  /**
   * TRUE if two element types store values the same way.
   */
  private static function compatible(string $a, ?string $b): bool {
    foreach (self::COMPATIBLE as $group) {
      if (in_array($a, $group, TRUE) && in_array($b, $group, TRUE)) {
        return TRUE;
      }
    }
    return FALSE;
  }

}
