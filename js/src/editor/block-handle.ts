/**
 * The handle shown left of the block under the pointer: "+" opens the
 * insert menu on a new line below, and the grip drags the block.
 *
 * Dragging uses ProseMirror's own drop handling: on dragstart the block is
 * selected and handed to `view.dragging`, exactly like dragging a selected
 * node, so the drop cursor, undo and the move itself all come for free.
 */
import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { html, render } from 'lit';
import { icon } from '../ui/icons';
import { insertParagraphAfter } from './commands';
import type { EditorContext } from './context';

export interface BlockHandleOptions {
  context: EditorContext | null;
}

export const BlockHandle = Extension.create<BlockHandleOptions>({
  name: 'formyBlockHandle',

  addOptions() {
    return { context: null };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const context = this.options.context;
    return [new Plugin({
      key: new PluginKey('formyBlockHandle'),
      view: (view) => new HandleView(view, editor, context),
    })];
  },
});

class HandleView {
  private readonly handle: HTMLElement;
  private blockPos: number | null = null;
  /** Block grabbed by the grip; fixed from mousedown until the drag ends. */
  private grabbedPos: number | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly editor: Editor,
    private readonly context: EditorContext | null,
  ) {
    this.handle = document.createElement('div');
    this.handle.className = 'formy-handle';
    this.handle.hidden = true;
    render(html`
      <button type="button" class="formy-handle__add" title="Add a block below" aria-label="Add a block below"
        @click=${this.onAdd}>${icon('plus')}</button>
      <button type="button" class="formy-handle__grip" title="Drag to move. Click to select." aria-label="Drag to move"
        draggable="true" @mousedown=${this.onGrab} @dragstart=${this.onDragStart} @dragend=${this.onDragEnd} @click=${this.onSelect}>${icon('grip')}</button>
    `, this.handle);

    const wrapper = view.dom.parentElement!;
    wrapper.appendChild(this.handle);
    wrapper.addEventListener('mousemove', this.onMouseMove);
    wrapper.addEventListener('mouseleave', this.onMouseLeave);
  }

  update(): void {
    // The block under the handle may have moved; hide until the next move.
    if (this.blockPos !== null && this.blockPos >= this.view.state.doc.content.size) {
      this.hide();
    }
  }

  destroy(): void {
    const wrapper = this.view.dom.parentElement;
    wrapper?.removeEventListener('mousemove', this.onMouseMove);
    wrapper?.removeEventListener('mouseleave', this.onMouseLeave);
    this.handle.remove();
  }

  /** The top-level block whose vertical extent contains `y`. */
  private blockAt(y: number): { pos: number; dom: HTMLElement } | null {
    let found: { pos: number; dom: HTMLElement } | null = null;
    this.view.state.doc.forEach((_node, pos) => {
      if (found) return;
      const dom = this.view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) return;
      const rect = dom.getBoundingClientRect();
      if (y >= rect.top - 4 && y <= rect.bottom + 4) {
        found = { pos, dom };
      }
    });
    return found;
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (this.grabbedPos !== null || !this.editor.isEditable || (event.target instanceof Node && this.handle.contains(event.target))) return;
    const block = this.blockAt(event.clientY);
    if (!block) return;
    this.blockPos = block.pos;
    const wrapperRect = this.view.dom.parentElement!.getBoundingClientRect();
    const rect = block.dom.getBoundingClientRect();
    this.handle.style.top = `${rect.top - wrapperRect.top}px`;
    this.handle.hidden = false;
  };

  private readonly onMouseLeave = (): void => {
    this.hide();
  };

  private hide(): void {
    this.handle.hidden = true;
    this.blockPos = null;
  }

  private readonly onAdd = (): void => {
    if (this.blockPos !== null) insertParagraphAfter(this.editor, this.blockPos, true);
  };

  private readonly onSelect = (): void => {
    if (this.blockPos === null) return;
    const node = this.view.state.doc.nodeAt(this.blockPos);
    this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, this.blockPos)));
    this.view.focus();
    if (node && 'blockId' in node.attrs && node.type.name === 'formyField') {
      this.context?.activate(node.attrs.blockId);
    }
  };

  private readonly onGrab = (): void => {
    this.grabbedPos = this.blockPos;
    document.addEventListener('mouseup', () => { this.grabbedPos = null; }, { once: true });
  };

  private readonly onDragStart = (event: DragEvent): void => {
    const pos = this.grabbedPos ?? this.blockPos;
    if (pos === null || !event.dataTransfer) return;
    const { state } = this.view;
    const selection = NodeSelection.create(state.doc, pos);
    this.view.dispatch(state.tr.setSelection(selection));

    const slice = selection.content();
    const { dom, text } = this.view.serializeForClipboard(slice);
    event.dataTransfer.clearData();
    event.dataTransfer.setData('text/html', dom.innerHTML);
    event.dataTransfer.setData('text/plain', text);
    event.dataTransfer.effectAllowed = 'move';
    const blockDom = this.view.nodeDOM(pos);
    if (blockDom instanceof HTMLElement) {
      event.dataTransfer.setDragImage(blockDom, 0, 0);
    }
    this.view.dragging = { slice, move: true };
  };

  private readonly onDragEnd = (): void => {
    this.view.dragging = null;
    this.grabbedPos = null;
    this.hide();
  };
}
