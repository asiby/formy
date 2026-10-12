<?php

declare(strict_types=1);

namespace Drupal\formy\Document;

/**
 * Thrown when a Formy document cannot be saved.
 */
final class InvalidDocumentException extends \InvalidArgumentException {

  /**
   * @param array<int, array{path: string, message: string}> $violations
   *   What is wrong, with a path such as "blocks.2.settings.label".
   */
  public function __construct(public readonly array $violations) {
    parent::__construct('Invalid Formy document: ' . implode(' ', array_map(
      static fn(array $v): string => $v['path'] . ': ' . $v['message'],
      $violations,
    )));
  }

}
