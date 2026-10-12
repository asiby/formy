<?php

declare(strict_types=1);

namespace Drupal\Tests\formy\Unit;

use Drupal\formy\Document\DocumentConverter;
use Drupal\formy\Document\InvalidDocumentException;

/**
 * @coversDefaultClass \Drupal\formy\Document\DocumentConverter
 * @group formy
 */
final class DocumentConverterTest extends FormyUnitTestCase {

  private DocumentConverter $converter;

  protected function setUp(): void {
    parent::setUp();
    $this->converter = new DocumentConverter(TestRegistry::core());
  }

  /**
   * A typical webform, as Webform stores it.
   */
  private function elements(): array {
    return [
      'intro' => ['#type' => 'webform_markup', '#markup' => '<h2>About you</h2>'],
      'full_name' => ['#type' => 'textfield', '#title' => 'Full name', '#required' => TRUE],
      'email' => ['#type' => 'email', '#title' => 'Email', '#title_display' => 'invisible'],
      'attending' => ['#type' => 'select', '#title' => 'Attending?', '#options' => ['yes' => 'Yes', 'no' => 'No']],
      'address' => ['#type' => 'webform_address', '#title' => 'Address'],
      'details' => [
        '#type' => 'fieldset',
        '#title' => 'Details',
        'notes' => ['#type' => 'textarea', '#title' => 'Notes'],
      ],
      'consent' => ['#type' => 'webform_signature', '#title' => 'Sign here', '#required' => TRUE],
    ];
  }

  public function testImportMapsKnownElementsToComponents(): void {
    $document = $this->converter->import($this->elements());
    $types = array_column($document['blocks'], 'type', 'key');
    $this->assertSame([
      'intro' => 'heading',
      'full_name' => 'short_text',
      'email' => 'email',
      'attending' => 'single_choice',
      'address' => DocumentConverter::ADVANCED,
      'details' => DocumentConverter::ADVANCED,
      'consent' => 'signature',
    ], $types);
    $this->assertSame(1, $document['version']);
    $this->assertSame('dropdown', $document['blocks'][3]['settings']['display']);
  }

  public function testAdvancedBlocksExposeOnlyASummary(): void {
    $document = $this->converter->import($this->elements());
    $this->assertSame(['title' => 'Details', 'elementType' => 'fieldset'], $document['blocks'][5]['settings']);
  }

  public function testUnchangedDocumentCompilesToTheSameElements(): void {
    $elements = $this->elements();
    $compiled = $this->converter->compile($this->converter->import($elements), $elements);
    $this->assertEquals($elements, $compiled);
    $this->assertSame(array_keys($elements), array_keys($compiled));
  }

  public function testReorderingKeepsEveryElementIntact(): void {
    $elements = $this->elements();
    $document = $this->converter->import($elements);
    $document['blocks'] = array_reverse($document['blocks']);
    $compiled = $this->converter->compile($document, $elements);
    $this->assertSame(array_reverse(array_keys($elements)), array_keys($compiled));
    $this->assertEquals($elements['details'], $compiled['details']);
  }

  public function testEditingKeepsPropertiesFormyDoesNotManage(): void {
    $elements = $this->elements();
    $document = $this->converter->import($elements);
    $document['blocks'][2]['settings']['label'] = 'Work email';
    $compiled = $this->converter->compile($document, $elements);
    $this->assertSame('Work email', $compiled['email']['#title']);
    $this->assertSame('invisible', $compiled['email']['#title_display']);
  }

  public function testChangingComponentTypeDropsUnmanagedProperties(): void {
    $elements = $this->elements();
    $document = $this->converter->import($elements);
    $document['blocks'][2]['type'] = 'short_text';
    $document['blocks'][2]['settings'] = ['label' => 'Email', 'help' => '', 'required' => FALSE, 'placeholder' => '', 'maxLength' => NULL];
    $compiled = $this->converter->compile($document, $elements);
    $this->assertSame(['#type' => 'textfield', '#title' => 'Email'], $compiled['email']);
  }

  public function testNewBlocksCompile(): void {
    $document = ['version' => 1, 'blocks' => [
      ['id' => 'n1', 'type' => 'paragraph', 'key' => 'markup_1', 'settings' => ['text' => 'Hello & welcome']],
      ['id' => 'n2', 'type' => 'multiple_choice', 'key' => 'diet', 'settings' => [
        'label' => 'Diet', 'help' => '', 'required' => FALSE,
        'options' => [['value' => 'vegan', 'label' => 'Vegan']],
      ]],
    ]];
    $this->assertSame([
      'markup_1' => ['#type' => 'webform_markup', '#markup' => '<p>Hello &amp; welcome</p>'],
      'diet' => ['#type' => 'checkboxes', '#title' => 'Diet', '#options' => ['vegan' => 'Vegan']],
    ], $this->converter->compile($document));
  }

  public function testAdvancedFieldsCannotBeCreatedFromTheBrowser(): void {
    $document = ['version' => 1, 'blocks' => [
      ['id' => 'x', 'type' => DocumentConverter::ADVANCED, 'key' => 'evil', 'settings' => ['title' => 'x', 'elementType' => 'textfield']],
    ]];
    $this->expectException(InvalidDocumentException::class);
    $this->converter->compile($document, $this->elements());
  }

  public function testAdvancedFieldsCannotTakeOverAnotherKey(): void {
    $elements = $this->elements();
    $document = $this->converter->import($elements);
    // Pretend the browser relabelled the "full_name" question as advanced.
    $document['blocks'][1]['type'] = DocumentConverter::ADVANCED;
    $this->expectException(InvalidDocumentException::class);
    $this->converter->compile($document, $elements);
  }

  public function testUnknownSettingsAreRejected(): void {
    $document = ['version' => 1, 'blocks' => [
      ['id' => 'a', 'type' => 'date', 'key' => 'when', 'settings' => [
        'label' => 'When', 'help' => '', 'required' => FALSE, '#element_validate' => ['exit'],
      ]],
    ]];
    $violations = $this->converter->validate($document);
    $this->assertSame([['path' => 'blocks.0.settings.#element_validate', 'message' => 'Unknown setting.']], $violations);
  }

  public function testStructuralErrorsAreReported(): void {
    $document = ['version' => 2, 'blocks' => [
      ['id' => 'a', 'type' => 'date', 'key' => 'Bad Key', 'settings' => ['label' => 'A', 'help' => '', 'required' => FALSE]],
      ['id' => 'a', 'type' => 'nope', 'key' => 'ok', 'settings' => []],
      ['id' => 'c', 'type' => 'date', 'key' => 'ok', 'settings' => ['label' => '', 'help' => '', 'required' => FALSE]],
    ]];
    $paths = array_column($this->converter->validate($document), 'path');
    $this->assertSame([
      'version',
      'blocks.0.key',
      'blocks.1.id',
      'blocks.1.type',
      'blocks.2.key',
      'blocks.2.settings.label',
    ], $paths);
  }

  public function testMarkupWithTagsStaysAdvanced(): void {
    $document = $this->converter->import([
      'rich' => ['#type' => 'webform_markup', '#markup' => '<p>Read <strong>this</strong></p>'],
      'plain' => ['#type' => 'webform_markup', '#markup' => '<p>It\'s plain</p>'],
    ]);
    $this->assertSame([DocumentConverter::ADVANCED, 'paragraph'], array_column($document['blocks'], 'type'));
    $this->assertSame("It's plain", $document['blocks'][1]['settings']['text']);
  }

  public function testMultiSelectStaysAdvanced(): void {
    $document = $this->converter->import([
      'tags' => ['#type' => 'select', '#title' => 'Tags', '#multiple' => TRUE, '#options' => ['a' => 'A']],
    ]);
    $this->assertSame(DocumentConverter::ADVANCED, $document['blocks'][0]['type']);
  }

  public function testElementsTheComponentWouldAlterStayAdvanced(): void {
    // '#required' => 'yes' is not a boolean; importing would change it.
    $document = $this->converter->import([
      'q' => ['#type' => 'textfield', '#title' => 'Q', '#required' => 'yes'],
    ]);
    $this->assertSame(DocumentConverter::ADVANCED, $document['blocks'][0]['type']);
  }

  public function testRootPropertiesAreKept(): void {
    $elements = ['#attributes' => ['class' => ['x']]] + $this->elements();
    $compiled = $this->converter->compile($this->converter->import($elements), $elements);
    $this->assertSame(['class' => ['x']], $compiled['#attributes']);
  }

}
