import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { KEY_PATTERN, uniqueKey } from '../keys';
import type { ChoiceOption, ComponentDefinition, SettingSchema, Settings, SettingsAccessor } from '../sdk';
import { icon } from './icons';

/**
 * Settings for the active block. The form is generated from the component's
 * schema, unless the component names a custom settings editor (a custom
 * element implementing SettingsAccessor).
 *
 * Events:
 * - formy-settings {settings}: the complete new settings.
 * - formy-key {key}: a new key for an unsaved block ('' = automatic).
 * - formy-close.
 */
export class FormySettingsPanel extends LitElement {
  static properties = {
    definition: { attribute: false },
    settings: { attribute: false },
    blockKey: { attribute: false },
    keyLocked: { type: Boolean },
    suggestedKey: { type: String },
    messages: { attribute: false },
  };

  declare definition: ComponentDefinition | null;
  declare settings: Settings;
  declare blockKey: string | null;
  declare keyLocked: boolean;
  declare suggestedKey: string;
  /** Error messages by setting name ('' = the whole block). */
  declare messages: Record<string, string[]>;

  private accessor: SettingsAccessor | null = null;

  constructor() {
    super();
    this.definition = null;
    this.settings = {};
    this.blockKey = null;
    this.keyLocked = false;
    this.suggestedKey = '';
    this.messages = {};
  }

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.classList.add('formy-panel', 'formy-ui');
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('definition')) {
      this.accessor = this.createAccessor();
    }
    if (this.accessor && (changed.has('settings') || changed.has('definition'))) {
      this.accessor.writeValue(this.settings);
    }
  }

  /** Creates the component's custom settings editor, if it has one. */
  private createAccessor(): SettingsAccessor | null {
    const tag = this.definition?.settingsEditor;
    if (!tag || !customElements.get(tag)) return null;
    const accessor = document.createElement(tag) as SettingsAccessor;
    accessor.definition = this.definition!;
    accessor.registerOnChange((settings) => this.emitSettings(settings));
    return accessor;
  }

  private emitSettings(settings: Settings): void {
    this.dispatchEvent(new CustomEvent('formy-settings', { detail: { settings } }));
  }

  private set(name: string, value: unknown): void {
    this.emitSettings({ ...this.settings, [name]: value });
  }

  protected render() {
    const definition = this.definition;
    if (!definition) return nothing;
    const entries = Object.entries(definition.schema);
    const main = entries.filter(([, s]) => s.group !== 'advanced');
    const advanced = entries.filter(([, s]) => s.group === 'advanced');

    return html`
      <header class="formy-panel__header">
        <span class="formy-panel__icon">${icon(definition.icon)}</span>
        <h2 class="formy-panel__title">${definition.label}</h2>
        <button type="button" class="formy-tool" aria-label="Close settings" title="Close"
          @click=${() => this.dispatchEvent(new CustomEvent('formy-close'))}>${icon('close')}</button>
      </header>
      ${this.renderMessages('')}
      <div class="formy-panel__body">
        ${this.accessor
          ? this.accessor
          : html`
            ${main.map(([name, schema]) => this.renderSetting(name, schema))}
            ${advanced.length
              ? html`<details class="formy-panel__advanced">
                  <summary>Advanced</summary>
                  ${advanced.map(([name, schema]) => this.renderSetting(name, schema))}
                </details>`
              : nothing}`}
        ${this.renderKey()}
      </div>
    `;
  }

  private renderMessages(name: string): TemplateResult | typeof nothing {
    const messages = this.messages[name] ?? [];
    return messages.length
      ? html`<ul class="formy-panel__errors" role="alert">${messages.map((m) => html`<li>${m}</li>`)}</ul>`
      : nothing;
  }

  private renderSetting(name: string, schema: SettingSchema): TemplateResult {
    const id = `formy-setting-${name}`;
    const value = this.settings[name];
    const description = schema.description ? html`<div class="formy-panel__description">${schema.description}</div>` : nothing;
    let control: TemplateResult;

    switch (schema.type) {
      case 'boolean':
        return html`<div class="formy-panel__field formy-panel__field--inline">
          <input id=${id} type="checkbox" .checked=${live(value === true)}
            @change=${(e: Event) => this.set(name, (e.target as HTMLInputElement).checked)}>
          <label for=${id}>${schema.title}</label>
          ${description}${this.renderMessages(name)}
        </div>`;

      case 'text':
        control = html`<textarea id=${id} rows="3" maxlength=${schema.maxLength ?? nothing}
          .value=${live(String(value ?? ''))}
          @input=${(e: Event) => this.set(name, (e.target as HTMLTextAreaElement).value)}></textarea>`;
        break;

      case 'integer':
        control = html`<input id=${id} type="number" step="1" min=${schema.min ?? nothing} max=${schema.max ?? nothing}
          .value=${live(value === null || value === undefined ? '' : String(value))}
          @input=${(e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            const parsed = Number.parseInt(raw, 10);
            this.set(name, raw === '' || Number.isNaN(parsed) ? null : parsed);
          }}>`;
        break;

      case 'enum':
        control = html`<select id=${id} @change=${(e: Event) => this.set(name, (e.target as HTMLSelectElement).value)}>
          ${Object.entries(schema.enum ?? {}).map(([v, label]) => html`<option value=${v} ?selected=${v === value}>${label}</option>`)}
        </select>`;
        break;

      case 'options':
        control = this.renderChoices(name, Array.isArray(value) ? (value as ChoiceOption[]) : []);
        break;

      default:
        control = html`<input id=${id} type="text" maxlength=${schema.maxLength ?? nothing}
          .value=${live(String(value ?? ''))}
          @input=${(e: Event) => this.set(name, (e.target as HTMLInputElement).value)}>`;
    }

    return html`<div class="formy-panel__field">
      <label for=${id}>${schema.title}${schema.required ? html` <span class="formy-panel__required">*</span>` : nothing}</label>
      ${control}${description}${this.renderMessages(name)}
    </div>`;
  }

  /** List editor for choices; new choices get a unique value once. */
  private renderChoices(name: string, options: ChoiceOption[]): TemplateResult {
    const update = (next: ChoiceOption[]) => this.set(name, next);
    const add = () => {
      const taken = new Set(options.map((o) => o.value));
      const label = `Option ${options.length + 1}`;
      update([...options, { value: uniqueKey(label, 'option', taken), label }]);
    };
    return html`<ol class="formy-options" id=${`formy-setting-${name}`}>
      ${options.map((option, i) => html`<li class="formy-options__row">
        <input type="text" aria-label=${`Choice ${i + 1}`} .value=${live(option.label)}
          @input=${(e: Event) => update(options.map((o, j) => (j === i ? { ...o, label: (e.target as HTMLInputElement).value } : o)))}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
              this.updateComplete.then(() => this.querySelectorAll<HTMLInputElement>('.formy-options__row input')[i + 1]?.focus());
            }
          }}>
        <code class="formy-options__value" title="Stored value">${option.value}</code>
        <button type="button" class="formy-tool" aria-label=${`Remove choice ${i + 1}`} title="Remove"
          @click=${() => update(options.filter((_, j) => j !== i))}>${icon('trash')}</button>
      </li>`)}
    </ol>
    <button type="button" class="formy-button formy-button--quiet" @click=${add}>${icon('plus')} Add choice</button>`;
  }

  private renderKey(): TemplateResult {
    const invalid = !!this.blockKey && !KEY_PATTERN.test(this.blockKey);
    return html`<div class="formy-panel__field formy-panel__key">
      <label for="formy-setting-key">Field key</label>
      ${this.keyLocked
        ? html`<input id="formy-setting-key" type="text" .value=${this.blockKey ?? ''} readonly>
            <div class="formy-panel__description">${icon('lock')} Fixed: responses are stored under this key.</div>`
        : html`<input id="formy-setting-key" type="text" placeholder=${this.suggestedKey}
              .value=${live(this.blockKey ?? '')}
              @input=${(e: Event) => this.dispatchEvent(new CustomEvent('formy-key', { detail: { key: (e.target as HTMLInputElement).value } }))}>
            <div class="formy-panel__description">Leave empty to use “${this.suggestedKey}”. It cannot change after the first save.</div>
            ${invalid ? html`<ul class="formy-panel__errors"><li>Use lowercase letters, digits and underscores, starting with a letter.</li></ul>` : nothing}`}
      ${this.renderMessages('key')}
    </div>`;
  }
}

if (!customElements.get('formy-settings-panel')) {
  customElements.define('formy-settings-panel', FormySettingsPanel);
}

declare global {
  interface HTMLElementTagNameMap {
    'formy-settings-panel': FormySettingsPanel;
  }
}
