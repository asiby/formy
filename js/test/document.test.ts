import { describe, expect, it } from 'vitest';
import { FIELD_NODE, fromEditorContent, toEditorContent } from '../src/editor/document';
import { ADVANCED, type FormyDocument } from '../src/sdk';

const saved: FormyDocument = {
  version: 1,
  blocks: [
    { id: 'b_intro', type: 'heading', key: 'intro', settings: { text: 'About you' } },
    { id: 'b_name', type: 'short_text', key: 'name', settings: { label: 'Name', help: '', required: true, placeholder: '', maxLength: null } },
    { id: 'b_note', type: 'paragraph', key: 'note', settings: { text: 'Thanks!' } },
    { id: 'b_addr', type: ADVANCED, key: 'addr', settings: { title: 'Address', elementType: 'webform_address' } },
  ],
};

describe('document conversion', () => {
  it('round-trips a saved document unchanged', () => {
    const { document } = fromEditorContent(toEditorContent(saved));
    expect(document).toEqual(saved);
  });

  it('adds a trailing empty paragraph and drops it again', () => {
    const content = toEditorContent(saved);
    expect(content.content!.at(-1)).toEqual({ type: 'paragraph' });
    expect(fromEditorContent(content).document.blocks).toHaveLength(4);
  });

  it('gives new blocks keys from their label, avoiding saved keys', () => {
    const content = toEditorContent(saved);
    content.content!.push(
      { type: FIELD_NODE, attrs: { blockId: 'n_1', key: null, keyLocked: false, componentType: 'email', settings: { label: 'Name' } } },
      { type: 'paragraph', attrs: { blockId: null, key: null, keyLocked: false }, content: [{ type: 'text', text: '  Café & crème! ' }] },
    );
    const { document, nodeIndexes } = fromEditorContent(content);
    expect(document.blocks.slice(4).map((b) => b.key)).toEqual(['name_2', 'cafe_creme']);
    expect(document.blocks[5].settings).toEqual({ text: 'Café & crème!' });
    expect(nodeIndexes).toEqual([0, 1, 2, 3, 5, 6]);
  });

  it('treats a pasted copy of a saved question as new', () => {
    const content = toEditorContent(saved);
    content.content!.splice(2, 0, structuredClone(content.content![1]));
    const { document } = fromEditorContent(content);
    expect(document.blocks[1]).toMatchObject({ id: 'b_name', key: 'name' });
    expect(document.blocks[2].key).toBe('name_2');
    expect(document.blocks[2].id).not.toBe('b_name');
  });

  it('never duplicates an advanced field', () => {
    const content = toEditorContent(saved);
    content.content!.push(structuredClone(content.content![3]));
    const { document } = fromEditorContent(content);
    expect(document.blocks.filter((b) => b.type === ADVANCED)).toHaveLength(1);
  });

  it('keeps a valid key the user typed for a new block', () => {
    const { document } = fromEditorContent({ type: 'doc', content: [
      { type: FIELD_NODE, attrs: { blockId: 'n_2', key: 'my_key', keyLocked: false, componentType: 'date', settings: { label: 'When' } } },
      { type: FIELD_NODE, attrs: { blockId: 'n_3', key: 'Bad Key', keyLocked: false, componentType: 'date', settings: { label: 'When' } } },
    ] });
    expect(document.blocks.map((b) => b.key)).toEqual(['my_key', 'when']);
  });
});
