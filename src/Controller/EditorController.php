<?php

declare(strict_types=1);

namespace Drupal\formy\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\Core\Url;
use Drupal\formy\FormyComponentManager;
use Drupal\webform\WebformInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Renders the Formy editor page for a webform.
 *
 * The page is an empty mount point; js/src/index.ts builds the editor and
 * talks to ApiController.
 */
final class EditorController extends ControllerBase {

  public function __construct(
    private readonly FormyComponentManager $componentManager,
  ) {}

  public static function create(ContainerInterface $container): static {
    return new static($container->get('plugin.manager.formy_component'));
  }

  /**
   * Title callback.
   */
  public function title(WebformInterface $webform): TranslatableMarkup {
    return $this->t('Compose @title', ['@title' => $webform->label()]);
  }

  /**
   * The editor page.
   */
  public function page(WebformInterface $webform): array {
    $libraries = ['formy/editor'];
    foreach ($this->componentManager->getDefinitions() as $definition) {
      if (!empty($definition['library'])) {
        $libraries[] = $definition['library'];
      }
    }

    $id = $webform->id();
    return [
      '#type' => 'html_tag',
      '#tag' => 'div',
      '#attributes' => [
        'class' => ['formy-root'],
        'data-formy-editor' => $id,
      ],
      '#attached' => [
        'library' => array_values(array_unique($libraries)),
        'drupalSettings' => [
          'formy' => [
            'webformId' => $id,
            'endpoints' => [
              'components' => Url::fromRoute('formy.api.components')->toString(),
              'load' => Url::fromRoute('formy.api.load', ['webform' => $id])->toString(),
              'save' => Url::fromRoute('formy.api.save', ['webform' => $id])->toString(),
              'csrfToken' => Url::fromRoute('system.csrftoken')->toString(),
            ],
            'links' => [
              'view' => $webform->toUrl('canonical')->toString(),
              'build' => $webform->toUrl('edit-form')->toString(),
            ],
          ],
        ],
      ],
      // Components can be added or altered by any module.
      '#cache' => ['tags' => ['webform:' . $id], 'contexts' => ['user.permissions']],
    ];
  }

}
