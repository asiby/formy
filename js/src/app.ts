import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { html, LitElement, nothing } from 'lit';
import { ApiError, FormyApi } from './api';
import { BlockHandle } from './editor/block-handle';
import { BlockIdentity } from './editor/block-identity';
import { findBlock, updateBlockAttrs } from './editor/commands';
import type { EditorContext } from './editor/context';
import { FIELD_NODE, fromEditorContent, toEditorContent, type FieldAttrs } from './editor/document';
import { FormyField } from './editor/field-node';
import { SlashCommand } from './editor/slash-command';
import { slugify } from './keys';
import { ComponentRegistry } from './registry';
import type { DocumentMeta, FormyConfig, Settings, Violation } from './sdk';
import { icon } from './ui/icons';
import './ui/settings-panel';

type Status = 'loading' | 'ready' | 'saving' | 'failed';

interface Banner {
  tone: 'error' | 'info';
  message: string;
  details?: string[];
  reload?: boolean;
}

/** How long to wait for extension custom elements before rendering anyway. */
const CUSTOM_ELEMENT_TIMEOUT_MS = 3000;

/**
 * The whole editor: top bar, canvas and settings panel. It loads the
 * palette and the document, owns the Tiptap editor, and saves.
 */
export class FormyApp extends LitElement implements EditorContext {
  static properties = {
    config: { attribute: false },
    status: { state: true },
    dirty: { state: true },
    banner: { state: true },
    meta: { state: true },
  };

  declare config: FormyConfig;
  declare status: Status;
  declare dirty: boolean;
  declare banner: Banner | null;
  declare meta: DocumentMeta | null;

  registry = new ComponentRegistry([]);
  private api: FormyApi | null = null;
  private editor: Editor | null = null;
  private active: string | null = null;
  private focusRequests = new Set<string>();
  /** Messages by block id, then by setting name ('' = whole block). */
  private messages = new Map<string, Record<string, string[]>>();
  private listeners = new Set<() => void>();

  constructor() {
    super();
    this.status = 'loading';
    this.dirty = false;
    this.banner = null;
    this.meta = null;
  }

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('formy-app', 'formy-ui');
    window.addEventListener('beforeunload', this.onBeforeUnload);
    window.addEventListener('keydown', this.onKeydown);
    void this.load();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    window.removeEventListener('keydown', this.onKeydown);
    this.editor?.destroy();
  }

  // ---------------------------------------------------------------------
  // EditorContext
  // ---------------------------------------------------------------------

  activeBlockId(): string | null {
    return this.active;
  }

  activate(blockId: string | null): void {
    if (this.active === blockId) return;
    this.active = blockId;
    this.notify();
  }

  messagesFor(blockId: string): string[] {
    return Object.values(this.messages.get(blockId) ?? {}).flat();
  }

  requestFocus(blockId: string): void {
    this.focusRequests.add(blockId);
  }

  takeFocusRequest(blockId: string): boolean {
    return this.focusRequests.delete(blockId);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
    this.requestUpdate();
  }

  // ---------------------------------------------------------------------
  // Loading and saving
  // ---------------------------------------------------------------------

  private async load(): Promise<void> {
    this.api = new FormyApi(this.config.endpoints);
    try {
      const [components, loaded] = await Promise.all([this.api.components(), this.api.load()]);
      this.registry = new ComponentRegistry(components);
      await this.waitForCustomElements();
      this.meta = loaded.meta;
      await this.updateComplete;
      this.createEditor(loaded.document);
      this.status = 'ready';
    }
    catch (error) {
      this.status = 'failed';
      this.banner = { tone: 'error', message: error instanceof Error ? error.message : String(error), reload: true };
    }
  }

  /** Extension scripts may load after this one; give them a moment. */
  private async waitForCustomElements(): Promise<void> {
    const tags = this.registry.customElementTags();
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, CUSTOM_ELEMENT_TIMEOUT_MS));
    await Promise.race([Promise.all(tags.map((tag) => customElements.whenDefined(tag))), timeout]);
  }

  private createEditor(document: Parameters<typeof toEditorContent>[0]): void {
    const host = this.querySelector<HTMLElement>('.formy-editor-host')!;
    this.editor = new Editor({
      element: host,
      content: toEditorContent(document),
      extensions: [
        StarterKit.configure({
          heading: { levels: [2] },
          // Formy text is plain: no lists, code, quotes or inline formatting.
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          listKeymap: false,
          codeBlock: false,
          code: false,
          horizontalRule: false,
          hardBreak: false,
          bold: false,
          italic: false,
          strike: false,
          underline: false,
          link: false,
        }),
        Placeholder.configure({
          placeholder: ({ node }) => (node.type.name === 'heading' ? 'Heading' : 'Type “/” to add a question, or just write text'),
        }),
        BlockIdentity,
        FormyField.configure({ context: this }),
        SlashCommand.configure({ context: this }),
        BlockHandle.configure({ context: this }),
      ],
      editorProps: {
        attributes: { class: 'formy-canvas__doc', 'aria-label': 'Form content' },
      },
    });
    this.editor.on('transaction', ({ transaction }) => {
      if (transaction.docChanged && !transaction.getMeta('formySync')) {
        this.dirty = true;
      }
      this.requestUpdate();
    });
  }

  /** Saves the document. Public so tests and keyboard shortcuts can call it. */
  async save(): Promise<void> {
    const editor = this.editor;
    if (!editor || !this.api || !this.meta || this.status === 'saving') return;

    const { document, nodeIndexes } = fromEditorContent(editor.getJSON());
    // Saving makes the editor read-only, which drops focus; restore it after.
    const focused = globalThis.document.activeElement as HTMLElement | null;
    const selection = editor.state.selection;
    this.status = 'saving';
    this.banner = null;
    editor.setEditable(false);
    try {
      const result = await this.api.save(document, this.meta.revision);
      // The server returns the blocks in the same order: give each editor
      // node its saved id and now-fixed key.
      const tr = editor.state.tr.setMeta('formySync', true).setMeta('addToHistory', false);
      result.document.blocks.forEach((block, i) => {
        const index = nodeIndexes[i];
        let pos = 0;
        for (let n = 0; n < index; n++) pos += editor.state.doc.child(n).nodeSize;
        const node = editor.state.doc.child(index);
        if (this.active === node.attrs.blockId) this.active = block.id;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: block.id, key: block.key, keyLocked: true });
      });
      editor.view.dispatch(tr);
      this.meta = result.meta;
      this.messages.clear();
      this.dirty = false;
      this.status = 'ready';
    }
    catch (error) {
      this.status = 'ready';
      this.showSaveError(error, nodeIndexes);
    }
    finally {
      editor.setEditable(true);
      this.notify();
      if (focused === editor.view.dom) {
        editor.commands.setTextSelection(Math.min(selection.from, editor.state.doc.content.size));
        editor.view.focus();
      }
      else if (focused?.isConnected && focused !== globalThis.document.activeElement) {
        focused.focus();
      }
    }
  }

  private showSaveError(error: unknown, nodeIndexes: number[]): void {
    this.messages.clear();
    if (!(error instanceof ApiError)) {
      this.banner = { tone: 'error', message: String(error) };
      return;
    }
    const unplaced: string[] = [];
    for (const violation of error.violations) {
      if (!this.placeViolation(violation, error.code, nodeIndexes)) {
        unplaced.push(`${violation.path}: ${violation.message}`);
      }
    }
    this.banner = {
      tone: 'error',
      message: error.message,
      details: unplaced.length ? unplaced : undefined,
      reload: error.code === 'conflict',
    };
  }

  /** Attaches a violation to its block; FALSE if it has no block. */
  private placeViolation(violation: Violation, code: string, nodeIndexes: number[]): boolean {
    const doc = this.editor!.state.doc;
    let blockId: string | null = null;
    let setting = '';

    const match = /^blocks\.(\d+)(?:\.(settings)\.(.+)|\.(key))?/.exec(violation.path);
    if (code === 'invalid' && match) {
      const index = nodeIndexes[Number(match[1])];
      blockId = index !== undefined ? doc.child(index).attrs.blockId : null;
      setting = match[3] ?? match[4] ?? '';
    }
    else if (code === 'has_responses') {
      doc.forEach((node) => {
        if (node.attrs.key === violation.path) blockId = node.attrs.blockId;
      });
    }
    if (!blockId) return false;
    const entry = this.messages.get(blockId) ?? {};
    (entry[setting] ??= []).push(violation.message);
    this.messages.set(blockId, entry);
    return true;
  }

  // ---------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void this.save();
    }
  };

  private readonly onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.dirty) event.preventDefault();
  };

  private activeField(): { pos: number; attrs: FieldAttrs } | null {
    if (!this.editor || !this.active) return null;
    const found = findBlock(this.editor, this.active);
    return found && found.node.type.name === FIELD_NODE ? { pos: found.pos, attrs: found.node.attrs as FieldAttrs } : null;
  }

  private onSettings(event: CustomEvent<{ settings: Settings }>): void {
    const field = this.activeField();
    if (field && this.editor) updateBlockAttrs(this.editor, field.pos, { settings: event.detail.settings });
  }

  private onKey(event: CustomEvent<{ key: string }>): void {
    const field = this.activeField();
    if (field && this.editor && !field.attrs.keyLocked) {
      updateBlockAttrs(this.editor, field.pos, { key: event.detail.key.trim() || null });
    }
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  private statusText(): string {
    switch (this.status) {
      case 'loading': return 'Loading…';
      case 'saving': return 'Saving…';
      case 'failed': return 'Could not load';
      default: return this.dirty ? 'Unsaved changes' : 'All changes saved';
    }
  }

  protected render() {
    const field = this.activeField();
    const definition = field ? this.registry.get(field.attrs.componentType) : undefined;
    const label = field && typeof field.attrs.settings.label === 'string' ? field.attrs.settings.label : '';

    return html`
      <header class="formy-bar">
        <div class="formy-bar__title">
          <h1>${this.meta?.webform.title ?? 'Form'}</h1>
          <span class="formy-bar__status" role="status" data-status=${this.status} data-dirty=${String(this.dirty)}>${this.statusText()}</span>
        </div>
        <nav class="formy-bar__actions">
          <a class="formy-button formy-button--quiet" href=${this.config.links.view} target="_blank" rel="noopener">View form</a>
          <a class="formy-button formy-button--quiet" href=${this.config.links.build}>Webform builder</a>
          <button type="button" class="formy-button formy-button--primary" data-formy-save
            ?disabled=${this.status !== 'ready' || !this.dirty}
            @click=${() => this.save()}>Save</button>
        </nav>
      </header>
      ${this.meta?.hasSubmissions
        ? html`<p class="formy-notice">This form already has responses. Questions with answers can be edited and moved, but not deleted or turned into another type.</p>`
        : nothing}
      ${this.banner ? this.renderBanner(this.banner) : nothing}
      <div class="formy-layout">
        <main class="formy-canvas">
          <div class="formy-editor-host"></div>
        </main>
        ${field && definition
          ? html`<formy-settings-panel
              .definition=${definition}
              .settings=${field.attrs.settings}
              .blockKey=${field.attrs.key}
              ?keyLocked=${field.attrs.keyLocked}
              suggestedKey=${slugify(label) || field.attrs.componentType}
              .messages=${this.messages.get(field.attrs.blockId ?? '') ?? {}}
              @formy-settings=${this.onSettings}
              @formy-key=${this.onKey}
              @formy-close=${() => this.activate(null)}></formy-settings-panel>`
          : nothing}
      </div>
    `;
  }

  private renderBanner(banner: Banner) {
    return html`<div class="formy-banner formy-banner--${banner.tone}" role="alert">
      ${icon('alert')}
      <div>
        <p>${banner.message}</p>
        ${banner.details ? html`<ul>${banner.details.map((d) => html`<li>${d}</li>`)}</ul>` : nothing}
      </div>
      ${banner.reload ? html`<button type="button" class="formy-button" @click=${() => location.reload()}>Reload</button>` : nothing}
      <button type="button" class="formy-tool" aria-label="Dismiss" @click=${() => { this.banner = null; }}>${icon('close')}</button>
    </div>`;
  }
}

if (!customElements.get('formy-app')) {
  customElements.define('formy-app', FormyApp);
}

declare global {
  interface HTMLElementTagNameMap {
    'formy-app': FormyApp;
  }
}
