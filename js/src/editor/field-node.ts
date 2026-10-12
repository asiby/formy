/**
 * The `formyField` node: one question (or locked advanced field) on the
 * canvas. It is an atom for ProseMirror; its view renders the label input,
 * the preview and the block toolbar with Lit.
 */
import { mergeAttributes, Node, type NodeViewRendererProps } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { NodeView } from '@tiptap/pm/view';
import { html, nothing, render, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { ADVANCED, type BlockPreviewElement, type ComponentDefinition, type Settings } from '../sdk';
import { icon } from '../ui/icons';
import { renderPreview } from '../ui/preview';
import { deleteBlock, insertParagraphAfter, moveBlock, updateBlockAttrs } from './commands';
import type { EditorContext } from './context';
import { FIELD_NODE, type FieldAttrs } from './document';

export interface FormyFieldOptions {
  context: EditorContext | null;
}

export const FormyField = Node.create<FormyFieldOptions>({
  name: FIELD_NODE,
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { context: null };
  },

  addAttributes() {
    // Rendered as data-* attributes so copy/paste inside the editor works.
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-block-id'),
        renderHTML: (a) => ({ 'data-block-id': a.blockId }),
      },
      key: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-key'),
        renderHTML: (a) => ({ 'data-key': a.key }),
      },
      keyLocked: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-key-locked') === 'true',
        renderHTML: (a) => ({ 'data-key-locked': String(a.keyLocked) }),
      },
      componentType: {
        default: 'short_text',
        parseHTML: (el) => el.getAttribute('data-component'),
        renderHTML: (a) => ({ 'data-component': a.componentType }),
      },
      settings: {
        default: {},
        parseHTML: (el) => {
          try {
            return JSON.parse(el.getAttribute('data-settings') ?? '{}');
          }
          catch {
            return {};
          }
        },
        renderHTML: (a) => ({ 'data-settings': JSON.stringify(a.settings) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-formy-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-formy-field': '' })];
  },

  addNodeView() {
    const context = this.options.context;
    if (!context) {
      throw new Error('FormyField needs a context: FormyField.configure({ context }).');
    }
    return (props) => new FieldView(props, context);
  },
});

/** Renders one field block. */
export class FieldView implements NodeView {
  readonly dom: HTMLElement;
  private node: PMNode;
  private readonly unsubscribe: () => void;
  private customPreview: BlockPreviewElement | null = null;

  constructor(
    private readonly props: NodeViewRendererProps,
    private readonly context: EditorContext,
  ) {
    this.node = props.node;
    this.dom = document.createElement('div');
    this.dom.className = 'formy-block formy-field';
    this.dom.contentEditable = 'false';
    this.unsubscribe = context.subscribe(() => this.render());
    this.render();

    if (context.takeFocusRequest(this.attrs.blockId ?? '')) {
      requestAnimationFrame(() => this.dom.querySelector<HTMLInputElement>('[data-formy-label]')?.focus());
    }
  }

  private get attrs(): FieldAttrs {
    return this.node.attrs as FieldAttrs;
  }

  private get pos(): number | null {
    const pos = this.props.getPos();
    return typeof pos === 'number' ? pos : null;
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.render();
    return true;
  }

  selectNode(): void {
    this.dom.classList.add('is-selected');
  }

  deselectNode(): void {
    this.dom.classList.remove('is-selected');
  }

  /** Let inputs and buttons handle their own events; ProseMirror gets the rest. */
  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    return !!target?.closest('input, textarea, select, button, [data-formy-interactive]');
  }

  ignoreMutation(): boolean {
    return true;
  }

  destroy(): void {
    this.unsubscribe();
    render(nothing, this.dom);
  }

  private render(): void {
    const { blockId, componentType, settings } = this.attrs;
    const definition = this.context.registry.get(componentType);
    const advanced = componentType === ADVANCED || !definition;
    const messages = blockId ? this.context.messagesFor(blockId) : [];

    this.dom.classList.toggle('is-active', !!blockId && this.context.activeBlockId() === blockId);
    this.dom.classList.toggle('has-errors', messages.length > 0);
    this.dom.classList.toggle('is-advanced', advanced);

    render(html`
      <div class="formy-field__body" @click=${this.onBodyClick}>
        ${advanced ? this.advancedTemplate(settings, componentType) : this.questionTemplate(definition!, settings)}
        ${messages.length
          ? html`<ul class="formy-field__errors" role="alert">${messages.map((m) => html`<li>${icon('alert')} ${m}</li>`)}</ul>`
          : nothing}
      </div>
      <div class="formy-field__tools" data-formy-interactive>
        <button type="button" class="formy-tool" title="Move up (Alt+↑)" aria-label="Move up" @click=${() => this.move(-1)}>${icon('up')}</button>
        <button type="button" class="formy-tool" title="Move down (Alt+↓)" aria-label="Move down" @click=${() => this.move(1)}>${icon('down')}</button>
        ${advanced ? nothing : html`<button type="button" class="formy-tool" title="Settings" aria-label="Settings" @click=${this.openSettings}>${icon('settings')}</button>`}
        <button type="button" class="formy-tool formy-tool--danger" title="Delete" aria-label="Delete" @click=${this.remove}>${icon('trash')}</button>
      </div>
    `, this.dom);
  }

  private questionTemplate(definition: ComponentDefinition, settings: Settings): TemplateResult {
    const inline = Object.entries(definition.schema).find(([, s]) => s.inline)?.[0];
    const help = typeof settings.help === 'string' ? settings.help : '';
    return html`
      <div class="formy-field__head">
        <span class="formy-field__type" title=${definition.label}>${icon(definition.icon, definition.label)}</span>
        ${inline
          ? html`<input class="formy-field__label" data-formy-label type="text"
              .value=${live(String(settings[inline] ?? ''))}
              placeholder="Type a question"
              aria-label="Question"
              @input=${(e: InputEvent) => this.setSetting(inline, (e.target as HTMLInputElement).value)}
              @focus=${this.activate}
              @keydown=${this.onLabelKeydown}>`
          : html`<span class="formy-field__label">${definition.label}</span>`}
        ${settings.required ? html`<span class="formy-field__required" title="Required" aria-label="Required">*</span>` : nothing}
      </div>
      ${help ? html`<div class="formy-field__help">${help}</div>` : nothing}
      <div class="formy-field__preview" inert>${this.previewTemplate(definition, settings)}</div>
    `;
  }

  private advancedTemplate(settings: Settings, type: string): TemplateResult {
    const title = String(settings.title ?? type);
    const elementType = String(settings.elementType ?? type);
    return html`
      <div class="formy-field__head">
        <span class="formy-field__type">${icon('lock', 'Locked')}</span>
        <span class="formy-field__label">${title}</span>
      </div>
      <div class="formy-field__help">
        Advanced field (<code>${elementType}</code>). You can move or delete it here; edit it in Webform's Build tab.
      </div>
    `;
  }

  /** A component's custom preview element, or the built-in preview. */
  private previewTemplate(definition: ComponentDefinition, settings: Settings): unknown {
    const tag = definition.previewElement;
    if (tag && customElements.get(tag)) {
      if (!this.customPreview || this.customPreview.localName !== tag) {
        this.customPreview = document.createElement(tag) as BlockPreviewElement;
      }
      this.customPreview.definition = definition;
      this.customPreview.settings = settings;
      return this.customPreview;
    }
    return renderPreview(definition, settings);
  }

  private setSetting(name: string, value: unknown): void {
    if (this.pos === null) return;
    updateBlockAttrs(this.props.editor, this.pos, { settings: { ...this.attrs.settings, [name]: value } });
  }

  private readonly activate = (): void => {
    this.context.activate(this.attrs.blockId);
  };

  private readonly onBodyClick = (event: MouseEvent): void => {
    if (!(event.target as HTMLElement).closest('input')) {
      this.activate();
    }
  };

  private readonly openSettings = (): void => {
    this.activate();
  };

  private readonly onLabelKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && this.pos !== null) {
      // Like Tally: Enter on a question starts a new line below it.
      event.preventDefault();
      insertParagraphAfter(this.props.editor, this.pos);
    }
  };

  private move(direction: -1 | 1): void {
    if (this.pos !== null) moveBlock(this.props.editor, this.pos, direction);
  }

  private readonly remove = (): void => {
    if (this.pos === null) return;
    if (this.context.activeBlockId() === this.attrs.blockId) this.context.activate(null);
    deleteBlock(this.props.editor, this.pos);
  };
}
