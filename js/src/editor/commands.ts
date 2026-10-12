/**
 * Block-level editing operations shared by the canvas, the handle and the
 * keyboard shortcuts. All work on top-level blocks only.
 */
import type { Editor } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';

/** Position of the top-level block with this id, or null. */
export function findBlock(editor: Editor, blockId: string): { pos: number; node: PMNode } | null {
  let found: { pos: number; node: PMNode } | null = null;
  editor.state.doc.forEach((node, pos) => {
    if (!found && node.attrs.blockId === blockId) {
      found = { pos, node };
    }
  });
  return found;
}

/** Position of the top-level block containing the selection. */
export function currentBlockPos(editor: Editor): number | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.$from.depth === 0) {
    return selection.from;
  }
  const $from = selection.$from;
  return $from.depth >= 1 ? $from.before(1) : null;
}

/** Merges attributes into the top-level block at `pos`. */
export function updateBlockAttrs(editor: Editor, pos: number, attrs: Record<string, unknown>, addToHistory = true): void {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const tr = editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
  if (!addToHistory) tr.setMeta('addToHistory', false);
  editor.view.dispatch(tr);
}

/** Moves the top-level block at `pos` up (-1) or down (+1). */
export function moveBlock(editor: Editor, pos: number, direction: -1 | 1): boolean {
  const { state } = editor;
  const node = state.doc.nodeAt(pos);
  if (!node) return false;
  const index = state.doc.resolve(pos).index(0);
  const neighbourIndex = index + direction;
  if (neighbourIndex < 0 || neighbourIndex >= state.doc.childCount) return false;

  const neighbour = state.doc.child(neighbourIndex);
  const target = direction < 0 ? pos - neighbour.nodeSize : pos + neighbour.nodeSize;
  const offsetInBlock = state.selection.from - pos;

  const tr = state.tr.delete(pos, pos + node.nodeSize).insert(target, node);
  if (node.isAtom) {
    tr.setSelection(NodeSelection.create(tr.doc, target));
  }
  else {
    const inside = Math.min(Math.max(offsetInBlock, 1), node.nodeSize - 1);
    tr.setSelection(TextSelection.create(tr.doc, target + inside));
  }
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/** Deletes the top-level block at `pos`. */
export function deleteBlock(editor: Editor, pos: number): void {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
}

/**
 * Inserts an empty paragraph after the block at `pos` and puts the cursor in
 * it. With `slash`, types "/" so the insert menu opens.
 */
export function insertParagraphAfter(editor: Editor, pos: number, slash = false): void {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const after = pos + node.nodeSize;
  const paragraph = editor.schema.nodes.paragraph.create();
  const tr = editor.state.tr.insert(after, paragraph);
  tr.setSelection(TextSelection.create(tr.doc, after + 1));
  editor.view.dispatch(tr.scrollIntoView());
  if (slash) {
    editor.view.dispatch(editor.state.tr.insertText('/'));
  }
  editor.view.focus();
}
