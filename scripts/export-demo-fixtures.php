<?php

/**
 * @file
 * Regenerates js/demo/fixtures from the real components and converter.
 *
 * Run from a Drupal site with Formy enabled:
 *   drush php:script modules/custom/formy/scripts/export-demo-fixtures.php
 */

declare(strict_types=1);

$dir = dirname(__DIR__) . '/js/demo/fixtures';
$flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;

$components = [];
foreach (\Drupal::service('plugin.manager.formy_component')->getAllComponents() as $component) {
  $components[] = $component->getClientDefinition();
}
file_put_contents("$dir/components.json", json_encode(['components' => $components], $flags) . "\n");

$elements = json_decode(file_get_contents("$dir/elements.json"), TRUE, 512, JSON_THROW_ON_ERROR);
$document = \Drupal::service('formy.document_converter')->import($elements);
file_put_contents("$dir/document.json", json_encode($document, $flags) . "\n");

echo "Wrote components.json and document.json in $dir\n";
