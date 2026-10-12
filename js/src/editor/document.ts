/**
 * Converts between the server's Formy document and the editor's content.
 *
 * In the editor:
 * - a "paragraph" component is a normal paragraph you type in,
 * - a "heading" component is a normal level-2 heading,
 * - every other component (and advanced fields) is a `formyField` node.
 *
 * Both directions are pure functions so they are easy to unit test.
 */
import type { JSONContent } from '@tiptap/core';
import { ADVANCED, type FormyBlock, type FormyDocument, type Settings } from '../sdk';
import { KEY_PATTERN, newBlockId, uniqueKey } from '../keys';

export const FIELD_NODE = 'formyField';

/** Attributes shared by every top-level block in the editor. */
export interface BlockAttrs {
  blockId: string | null;
  key: string | null;
  /** TRUE once saved: the key is then fixed forever. */
  keyLocked: boolean;
}

export interface FieldAttrs extends BlockAttrs {
  componentType: string;
  settings: Settings;
}

/** Server document -> editor content. */
export function toEditorContent(document: FormyDocument): JSONContent {
  const content: JSONContent[] = document.blocks.map((block): JSONContent => {
    const attrs: BlockAttrs = { blockId: block.id, key: block.key, keyLocked: true };
    if (block.type === 'paragraph' || block.type === 'heading') {
      const text = String(block.settings.text ?? '');
      return {
        type: block.type,
        attrs: block.type === 'heading' ? { ...attrs, level: 2 } : attrs,
        content: text ? [{ type: 'text', text }] : [],
      };
    }
    const field: FieldAttrs = { ...attrs, componentType: block.type, settings: block.settings };
    return { type: FIELD_NODE, attrs: field };
  });
  content.push({ type: 'paragraph' });
  return { type: 'doc', content };
}

/** Text of an inline content list (paragraph or heading). */
function textOf(node: JSONContent): string {
  return (node.content ?? []).map((child) => (child.type === 'text' ? child.text ?? '' : '')).join('');
}

/** What fromEditorContent() returns, beyond the document itself. */
export interface ConversionResult {
  document: FormyDocument;
  /**
   * Index of the top-level editor node behind each document block, in
   * order. The editor is read-only while saving, so these indexes map the
   * server's response back onto the right nodes.
   */
  nodeIndexes: number[];
}

/**
 * Editor content -> server document.
 *
 * - Empty paragraphs and headings are dropped.
 * - Saved (locked) keys are kept. A repeated locked key (a pasted copy of a
 *   saved question) is treated as a new block.
 * - New blocks get a key from their label (or text) at this point.
 */
export function fromEditorContent(doc: JSONContent): ConversionResult {
  type Draft = { block: Omit<FormyBlock, 'key'> & { key: string | null }; nodeIndex: number; label: string };
  const drafts: Draft[] = [];
  const takenKeys = new Set<string>();
  const takenIds = new Set<string>();

  for (const [nodeIndex, node] of (doc.content ?? []).entries()) {
    const attrs = (node.attrs ?? {}) as Partial<FieldAttrs>;
    let type: string;
    let settings: Settings;
    let label: string;

    if (node.type === 'paragraph' || node.type === 'heading') {
      const text = textOf(node).trim();
      if (!text) continue;
      type = node.type;
      settings = { text };
      label = text;
    }
    else if (node.type === FIELD_NODE && attrs.componentType) {
      type = attrs.componentType;
      settings = attrs.settings ?? {};
      label = typeof settings.label === 'string' ? settings.label : type;
    }
    else {
      continue;
    }

    const editorId = attrs.blockId ?? null;
    let id = editorId && !takenIds.has(editorId) ? editorId : newBlockId();
    let key: string | null = null;
    if (attrs.key && KEY_PATTERN.test(attrs.key) && !takenKeys.has(attrs.key)) {
      // Locked keys win; an unlocked key the user typed is kept too.
      key = attrs.key;
      takenKeys.add(key);
    }
    else if (attrs.keyLocked) {
      // A duplicated saved block: it becomes new, with a new id.
      id = newBlockId();
    }
    // Advanced fields cannot be duplicated: the server only accepts them
    // under their original key.
    if (type === ADVANCED && key === null) continue;

    takenIds.add(id);
    drafts.push({ block: { id, type, key, settings }, nodeIndex, label });
  }

  // Second pass: keys for new blocks, avoiding every key kept above.
  const blocks: FormyBlock[] = drafts.map(({ block, label }) => ({
    ...block,
    key: block.key ?? uniqueKey(label, block.type, takenKeys),
  }));

  return {
    document: { version: 1, blocks },
    nodeIndexes: drafts.map((d) => d.nodeIndex),
  };
}
