<?php

declare(strict_types=1);

namespace Drupal\formy\Document;

/**
 * Small helpers for working with Webform element arrays.
 */
final class ElementTools {

  /**
   * Webform element types that never store submission data.
   *
   * Used to decide which changes are safe on a webform with responses.
   * TODO: ask Webform's element plugin manager (isInput()) instead.
   */
  public const NON_INPUT_TYPES = [
    'container',
    'details',
    'fieldset',
    'item',
    'label',
    'processed_text',
    'webform_flexbox',
    'webform_horizontal_rule',
    'webform_markup',
    'webform_message',
    'webform_section',
    'webform_wizard_page',
  ];

  /**
   * Removes properties whose value is '', NULL, FALSE or [].
   */
  public static function withoutEmpty(array $element): array {
    return array_filter($element, static fn(mixed $value): bool =>
      $value !== '' && $value !== NULL && $value !== FALSE && $value !== []
    );
  }

  /**
   * Returns the property ('#'-prefixed) part of an element.
   */
  public static function properties(array $element): array {
    return array_filter($element, static fn(int|string $key): bool => is_string($key) && str_starts_with($key, '#'), ARRAY_FILTER_USE_KEY);
  }

  /**
   * Returns the child elements (non '#' keys) of an element.
   */
  public static function children(array $element): array {
    return array_diff_key($element, self::properties($element));
  }

  /**
   * Flattens an element tree to key => element type, children included.
   *
   * @return array<string, string|null>
   */
  public static function flattenTypes(array $elements): array {
    $types = [];
    foreach (self::children($elements) as $key => $element) {
      if (!is_array($element)) {
        continue;
      }
      $types[(string) $key] = isset($element['#type']) && is_string($element['#type']) ? $element['#type'] : NULL;
      $types += self::flattenTypes($element);
    }
    return $types;
  }

  /**
   * Escapes plain text for use inside an HTML element.
   *
   * Quotes are left alone so that text like "it's" survives a round trip.
   */
  public static function escapeText(string $text): string {
    return htmlspecialchars($text, ENT_NOQUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
  }

  /**
   * Reverses escapeText(); returns NULL if the HTML contains tags.
   */
  public static function unescapeText(string $html): ?string {
    if (str_contains($html, '<') || str_contains($html, '>')) {
      return NULL;
    }
    return html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
  }

}
