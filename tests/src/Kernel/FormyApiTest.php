<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Kernel;

use Drupal\Core\Serialization\Yaml;
use Drupal\formy\Controller\ApiController;
use Drupal\formy\Controller\EditorController;
use Drupal\KernelTests\KernelTestBase;
use Drupal\webform\Entity\Webform;
use Drupal\webform\Entity\WebformSubmission;
use Drupal\webform\WebformInterface;
use PHPUnit\Framework\Attributes\Group;
use Symfony\Component\HttpFoundation\Request;

/**
 * Exercises plugin discovery, the API controller and the editor page against
 * a real Webform.
 */
#[Group('formy')]
final class FormyApiTest extends KernelTestBase {

  protected static $modules = [
    'system',
    'user',
    'field',
    'path',
    'path_alias',
    'webform',
    'formy',
  ];

  private WebformInterface $webform;

  protected function setUp(): void {
    parent::setUp();
    $this->installEntitySchema('user');
    $this->installEntitySchema('path_alias');
    $this->installEntitySchema('webform_submission');
    $this->installSchema('webform', ['webform']);
    $this->installConfig(['system', 'webform']);
    $this->container->get('router.builder')->rebuild();

    $this->webform = Webform::create([
      'id' => 'formy_test',
      'title' => 'Formy test',
      'elements' => Yaml::encode([
        'intro' => ['#type' => 'webform_markup', '#markup' => '<h2>Hello</h2>'],
        'full_name' => ['#type' => 'textfield', '#title' => 'Full name', '#required' => TRUE],
        'email' => ['#type' => 'email', '#title' => 'Email', '#title_display' => 'invisible'],
        'address' => ['#type' => 'webform_address', '#title' => 'Address'],
      ]),
    ]);
    $this->webform->save();
  }

  private function api(): ApiController {
    return ApiController::create($this->container);
  }

  private function json($response): array {
    return json_decode($response->getContent(), TRUE);
  }

  private function reload(): WebformInterface {
    return Webform::load('formy_test');
  }

  private function saveRequest(array $document, string $revision): Request {
    return Request::create('/formy/api/webform/formy_test', 'POST', [], [], [], [], json_encode([
      'document' => $document,
      'revision' => $revision,
    ]));
  }

  public function testComponentsAreDiscovered(): void {
    $manager = $this->container->get('plugin.manager.formy_component');
    $ids = array_keys($manager->getAllComponents());
    $this->assertSame([
      'short_text', 'long_text', 'email', 'number', 'date',
      'single_choice', 'multiple_choice', 'signature', 'heading', 'paragraph',
    ], $ids);
    $types = array_map(fn($c) => $c->getPluginId(), $manager->getComponentsForElementType('webform_markup'));
    $this->assertSame(['heading', 'paragraph'], $types);

    $body = $this->json($this->api()->components());
    $this->assertCount(10, $body['components']);
    $this->assertSame('Short answer', $body['components'][0]['label']);
    $this->assertSame('formy-signature-preview', $body['components'][7]['previewElement']);
  }

  public function testLoad(): void {
    $body = $this->json($this->api()->load($this->webform));
    $this->assertSame(
      ['heading', 'short_text', 'email', '_advanced'],
      array_column($body['document']['blocks'], 'type'),
    );
    $this->assertFalse($body['meta']['hasSubmissions']);
    $this->assertSame('Formy test', $body['meta']['webform']['title']);
    $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $body['meta']['revision']);
  }

  public function testSaveRoundTrip(): void {
    $loaded = $this->json($this->api()->load($this->webform));
    $document = $loaded['document'];
    $document['blocks'][1]['settings']['label'] = 'Your name';
    $document['blocks'] = array_reverse($document['blocks']);
    $document['blocks'][] = [
      'id' => 'n_new', 'type' => 'signature', 'key' => 'sign_here',
      'settings' => ['label' => 'Sign here', 'help' => '', 'required' => TRUE],
    ];

    $response = $this->api()->save($this->webform, $this->saveRequest($document, $loaded['meta']['revision']));
    $this->assertSame(200, $response->getStatusCode(), $response->getContent());

    $elements = $this->reload()->getElementsDecoded();
    $this->assertSame(['address', 'email', 'full_name', 'intro', 'sign_here'], array_keys($elements));
    $this->assertSame('Your name', $elements['full_name']['#title']);
    $this->assertSame('invisible', $elements['email']['#title_display']);
    $this->assertSame(['#type' => 'webform_address', '#title' => 'Address'], $elements['address']);
    $this->assertSame(['#type' => 'webform_signature', '#title' => 'Sign here', '#required' => TRUE], $elements['sign_here']);

    // The response is the re-imported document, with server ids.
    $body = $this->json($response);
    $this->assertSame('b_sign_here', $body['document']['blocks'][4]['id']);
    $this->assertNotSame($loaded['meta']['revision'], $body['meta']['revision']);
  }

  public function testStaleRevisionIsRefused(): void {
    $loaded = $this->json($this->api()->load($this->webform));
    $response = $this->api()->save($this->webform, $this->saveRequest($loaded['document'], 'stale'));
    $this->assertSame(409, $response->getStatusCode());
    $this->assertSame('conflict', $this->json($response)['error']);
  }

  public function testInvalidDocumentIsRefused(): void {
    $loaded = $this->json($this->api()->load($this->webform));
    $document = $loaded['document'];
    $document['blocks'][1]['settings']['label'] = '';
    $response = $this->api()->save($this->webform, $this->saveRequest($document, $loaded['meta']['revision']));
    $this->assertSame(422, $response->getStatusCode());
    $this->assertSame('blocks.1.settings.label', $this->json($response)['violations'][0]['path']);
    $this->assertSame('Full name', $this->reload()->getElementsDecoded()['full_name']['#title']);
  }

  public function testQuestionsWithResponsesAreProtected(): void {
    WebformSubmission::create([
      'webform_id' => 'formy_test',
      'data' => ['full_name' => 'Ada', 'email' => 'ada@example.com'],
    ])->save();

    $loaded = $this->json($this->api()->load($this->webform));
    $this->assertTrue($loaded['meta']['hasSubmissions']);
    $document = $loaded['document'];
    // Remove "full_name".
    array_splice($document['blocks'], 1, 1);

    $response = $this->api()->save($this->webform, $this->saveRequest($document, $loaded['meta']['revision']));
    $this->assertSame(409, $response->getStatusCode());
    $body = $this->json($response);
    $this->assertSame('has_responses', $body['error']);
    $this->assertSame('full_name', $body['violations'][0]['path']);
  }

  public function testEditorPage(): void {
    $page = EditorController::create($this->container)->page($this->webform);
    $this->assertContains('formy/editor', $page['#attached']['library']);
    $this->assertContains('formy/signature_preview', $page['#attached']['library']);
    $settings = $page['#attached']['drupalSettings']['formy'];
    $this->assertSame('formy_test', $settings['webformId']);
    $this->assertStringEndsWith('/formy/api/webform/formy_test', $settings['endpoints']['save']);
    $this->assertStringEndsWith('/session/token', $settings['endpoints']['csrfToken']);

    // The libraries resolve to files that exist.
    $discovery = $this->container->get('library.discovery');
    foreach (['editor', 'signature_preview'] as $name) {
      $library = $discovery->getLibraryByName('formy', $name);
      $this->assertNotFalse($library);
      foreach ($library['js'] as $js) {
        $this->assertFileExists(DRUPAL_ROOT . '/' . $js['data']);
      }
    }
  }

}
