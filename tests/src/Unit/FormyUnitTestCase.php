<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\Tests\UnitTestCase;

/**
 * Base for Formy unit tests: makes translatable strings castable.
 */
abstract class FormyUnitTestCase extends UnitTestCase {

  protected function setUp(): void {
    parent::setUp();
    $container = new ContainerBuilder();
    $container->set('string_translation', $this->getStringTranslationStub());
    \Drupal::setContainer($container);
  }

}
