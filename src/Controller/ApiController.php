<?php

declare(strict_types=1);

namespace Drupal\formy\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\formy\Document\ChangeGuard;
use Drupal\formy\Document\DocumentConverter;
use Drupal\formy\Document\InvalidDocumentException;
use Drupal\formy\FormyComponentManager;
use Drupal\webform\WebformInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * JSON endpoints used by the editor.
 *
 * Responses:
 * - 200 {document, meta}
 * - 400 {error: 'bad_request', message}
 * - 409 {error: 'conflict' | 'has_responses', message, violations?}
 * - 422 {error: 'invalid', violations: [{path, message}]}
 */
final class ApiController extends ControllerBase {

  public function __construct(
    private readonly FormyComponentManager $componentManager,
    private readonly DocumentConverter $converter,
  ) {}

  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('plugin.manager.formy_component'),
      $container->get('formy.document_converter'),
    );
  }

  /**
   * GET /formy/api/components: the component palette.
   */
  public function components(): JsonResponse {
    $definitions = [];
    foreach ($this->componentManager->getAllComponents() as $component) {
      $definitions[] = $component->getClientDefinition();
    }
    return new JsonResponse(['components' => $definitions]);
  }

  /**
   * GET /formy/api/webform/{webform}: the webform as a document.
   */
  public function load(WebformInterface $webform): JsonResponse {
    $elements = $webform->getElementsDecoded();
    return new JsonResponse([
      'document' => $this->converter->import($elements),
      'meta' => $this->meta($webform, $elements),
    ]);
  }

  /**
   * POST /formy/api/webform/{webform}: save a document.
   *
   * Body: {"document": {...}, "revision": "<revision from load>"}.
   */
  public function save(WebformInterface $webform, Request $request): JsonResponse {
    $body = json_decode($request->getContent(), TRUE);
    if (!is_array($body) || !is_array($body['document'] ?? NULL)) {
      return $this->error(400, 'bad_request', 'Expected a JSON body with a "document".');
    }

    $current = $webform->getElementsDecoded();
    if (($body['revision'] ?? NULL) !== self::revision($current)) {
      return $this->error(409, 'conflict', 'This form was changed elsewhere since you opened it. Reload to get the latest version.');
    }

    try {
      $elements = $this->converter->compile($body['document'], $current);
    }
    catch (InvalidDocumentException $e) {
      return new JsonResponse(['error' => 'invalid', 'violations' => $e->violations], 422);
    }

    if ($this->hasSubmissions($webform)) {
      $violations = ChangeGuard::check($current, $elements);
      if ($violations) {
        return $this->error(409, 'has_responses', 'Some changes would orphan existing responses.', $violations);
      }
    }

    // TODO: run Webform's own elements validator before saving.
    $webform->setElements($elements);
    $webform->save();

    $saved = $webform->getElementsDecoded();
    return new JsonResponse([
      'document' => $this->converter->import($saved),
      'meta' => $this->meta($webform, $saved),
    ]);
  }

  /**
   * Metadata the editor shows alongside the document.
   */
  private function meta(WebformInterface $webform, array $elements): array {
    return [
      'revision' => self::revision($elements),
      'hasSubmissions' => $this->hasSubmissions($webform),
      'webform' => [
        'id' => $webform->id(),
        'title' => $webform->label(),
        'status' => $webform->isOpen() ? 'open' : 'closed',
      ],
    ];
  }

  /**
   * A fingerprint of the elements, used to detect concurrent edits.
   */
  private static function revision(array $elements): string {
    return hash('sha256', json_encode($elements, JSON_THROW_ON_ERROR));
  }

  private function hasSubmissions(WebformInterface $webform): bool {
    /** @var \Drupal\webform\WebformSubmissionStorageInterface $storage */
    $storage = $this->entityTypeManager()->getStorage('webform_submission');
    return $storage->getTotal($webform) > 0;
  }

  private function error(int $status, string $code, string $message, array $violations = []): JsonResponse {
    $body = ['error' => $code, 'message' => $message];
    if ($violations) {
      $body['violations'] = $violations;
    }
    return new JsonResponse($body, $status);
  }

}
