/**
 * Gives every top-level block a unique id, and keeps saved keys unique.
 *
 * - Paragraphs and headings get the same id/key attributes as fields.
 * - After any change, a block without an id (new line, paste) gets one.
 * - A block that repeats another block's id or key (a pasted copy) gets a new
 *   id and loses the key, so it saves as a new question.
 * - Alt+↑ / Alt+↓ move the current block.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { newBlockId } from '../keys';
import { currentBlockPos, moveBlock } from './commands';

export const BlockIdentity = Extension.create({
  name: 'formyBlockIdentity',

  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        blockId: { default: null, keepOnSplit: false, rendered: false },
        key: { default: null, keepOnSplit: false, rendered: false },
        keyLocked: { default: false, keepOnSplit: false, rendered: false },
      },
    }];
  },

  addKeyboardShortcuts() {
    const move = (direction: -1 | 1) => () => {
      const pos = currentBlockPos(this.editor);
      return pos !== null && moveBlock(this.editor, pos, direction);
    };
    return {
      'Alt-ArrowUp': move(-1),
      'Alt-ArrowDown': move(1),
    };
  },

  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('formyBlockIdentity'),
      appendTransaction: (transactions, _old, state) => {
        if (!transactions.some((tr) => tr.docChanged)) return null;
        const ids = new Set<string>();
        const keys = new Set<string>();
        const tr = state.tr;
        state.doc.forEach((node, pos) => {
          if (!('blockId' in node.attrs)) return;
          const { blockId, key } = node.attrs as { blockId: string | null; key: string | null };
          const duplicateKey = !!key && keys.has(key);
          if (!blockId || ids.has(blockId) || duplicateKey) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              blockId: newBlockId(),
              ...(duplicateKey ? { key: null, keyLocked: false } : {}),
            });
          }
          if (blockId) ids.add(blockId);
          if (key && !duplicateKey) keys.add(key);
        });
        return tr.docChanged ? tr.setMeta('addToHistory', false) : null;
      },
    })];
  },
});
