/**
 * The "/" insert menu. Typing "/" opens <formy-slash-menu> listing the
 * registered components; picking one replaces the "/query" text.
 */
import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { newBlockId } from '../keys';
import type { ComponentDefinition } from '../sdk';
import '../ui/slash-menu';
import type { FormySlashMenu } from '../ui/slash-menu';
import { findBlock } from './commands';
import type { EditorContext } from './context';
import { FIELD_NODE, type FieldAttrs } from './document';

export interface SlashCommandOptions {
  context: EditorContext | null;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'formySlashCommand',

  addOptions() {
    return { context: null };
  },

  addProseMirrorPlugins() {
    const context = this.options.context!;
    return [Suggestion<ComponentDefinition, ComponentDefinition>({
      editor: this.editor,
      pluginKey: new PluginKey('formySlashCommand'),
      char: '/',
      allowSpaces: false,
      startOfLine: false,
      // Only in paragraphs: a "/" typed in a heading stays a "/".
      allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name === 'paragraph',
      items: ({ query }) => context.registry.search(query),
      command: ({ editor, range, props }) => insertComponent(editor, range, props, context),
      render: () => new MenuRenderer(),
    })];
  },
});

/** Replaces the "/query" text with the chosen component. */
export function insertComponent(editor: Editor, range: Range, definition: ComponentDefinition, context: EditorContext): void {
  if (definition.id === 'paragraph') {
    editor.chain().focus().deleteRange(range).setParagraph().run();
    return;
  }
  if (definition.id === 'heading') {
    editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    return;
  }

  const blockId = newBlockId();
  const attrs: FieldAttrs = {
    blockId,
    key: null,
    keyLocked: false,
    componentType: definition.id,
    settings: structuredClone(definition.defaults),
  };
  context.requestFocus(blockId);
  editor.chain().deleteRange(range).command(({ tr, state }) => {
    const field = state.schema.nodes[FIELD_NODE].create(attrs);
    const $from = tr.selection.$from;
    const paragraph = $from.parent;
    const start = $from.before(1);
    if (paragraph.content.size === 0) {
      // Typed on an empty line: the question takes the line's place.
      tr.replaceWith(start, start + paragraph.nodeSize, field);
    }
    else {
      // Typed after some text: the question goes below that line.
      tr.insert(start + paragraph.nodeSize, field);
    }
    return true;
  }).run();
  context.activate(blockId);
  // Focus the new question's label right away, so typing continues there.
  const found = findBlock(editor, blockId);
  const dom = found ? editor.view.nodeDOM(found.pos) : null;
  if (dom instanceof HTMLElement) {
    dom.querySelector<HTMLInputElement>('[data-formy-label]')?.focus();
  }
}

/** Shows the menu next to the "/" and forwards keys to it. */
class MenuRenderer {
  private menu: FormySlashMenu | null = null;
  private props: SuggestionProps<ComponentDefinition, ComponentDefinition> | null = null;

  onStart = (props: SuggestionProps<ComponentDefinition, ComponentDefinition>): void => {
    this.menu = document.createElement('formy-slash-menu') as FormySlashMenu;
    document.body.appendChild(this.menu);
    this.menu.addEventListener('formy-pick', (e) => {
      this.props?.command((e as CustomEvent<ComponentDefinition>).detail);
    });
    this.onUpdate(props);
  };

  onUpdate = (props: SuggestionProps<ComponentDefinition, ComponentDefinition>): void => {
    this.props = props;
    if (!this.menu) return;
    this.menu.items = props.items;
    this.menu.query = props.query;
    const rect = props.clientRect?.();
    if (!rect) return;
    const anchor = { getBoundingClientRect: () => rect };
    void computePosition(anchor, this.menu, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      if (this.menu) Object.assign(this.menu.style, { left: `${x}px`, top: `${y}px` });
    });
  };

  onKeyDown = ({ event }: SuggestionKeyDownProps): boolean => {
    if (event.key === 'Escape') {
      this.onExit();
      return true;
    }
    return this.menu?.handleKey(event) ?? false;
  };

  onExit = (): void => {
    this.menu?.remove();
    this.menu = null;
    this.props = null;
  };
}
