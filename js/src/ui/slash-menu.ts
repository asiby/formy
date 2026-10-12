import { html, LitElement, nothing, type PropertyValues } from 'lit';
import type { ComponentDefinition } from '../sdk';
import { icon } from './icons';

/**
 * The "/" insert menu. Fires `formy-pick` with the chosen definition.
 * Keyboard handling is driven by the editor through handleKey().
 */
export class FormySlashMenu extends LitElement {
  static properties = {
    items: { attribute: false },
    query: { type: String },
    selected: { state: true },
  };

  declare items: ComponentDefinition[];
  declare query: string;
  declare selected: number;

  constructor() {
    super();
    this.items = [];
    this.query = '';
    this.selected = 0;
  }

  // Light DOM: styled by formy-editor.css like the rest of the editor.
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'listbox');
    this.setAttribute('aria-label', 'Insert a block');
    this.classList.add('formy-slash-menu', 'formy-ui');
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('items')) {
      this.selected = 0;
    }
  }

  handleKey(event: KeyboardEvent): boolean {
    if (!this.items.length) return false;
    if (event.key === 'ArrowDown') {
      this.selected = (this.selected + 1) % this.items.length;
    }
    else if (event.key === 'ArrowUp') {
      this.selected = (this.selected - 1 + this.items.length) % this.items.length;
    }
    else if (event.key === 'Enter' || event.key === 'Tab') {
      this.pick(this.items[this.selected]);
    }
    else {
      return false;
    }
    return true;
  }

  private pick(item: ComponentDefinition | undefined): void {
    if (item) this.dispatchEvent(new CustomEvent('formy-pick', { detail: item }));
  }

  protected updated(): void {
    this.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  protected render() {
    if (!this.items.length) {
      return html`<div class="formy-slash-menu__empty">No block matches “${this.query}”</div>`;
    }
    let lastCategory = '';
    return this.items.map((item, i) => {
      const header = item.category !== lastCategory && !this.query
        ? html`<div class="formy-slash-menu__category" role="presentation">${item.category}</div>`
        : nothing;
      lastCategory = item.category;
      return html`${header}
        <div class="formy-slash-menu__item" role="option" id=${`formy-opt-${item.id}`}
          aria-selected=${i === this.selected ? 'true' : 'false'}
          @mousedown=${(e: MouseEvent) => e.preventDefault()}
          @mouseenter=${() => { this.selected = i; }}
          @click=${() => this.pick(item)}>
          <span class="formy-slash-menu__icon">${icon(item.icon)}</span>
          <span class="formy-slash-menu__text">
            <span class="formy-slash-menu__label">${item.label}</span>
            <span class="formy-slash-menu__description">${item.description}</span>
          </span>
        </div>`;
    });
  }
}

if (!customElements.get('formy-slash-menu')) {
  customElements.define('formy-slash-menu', FormySlashMenu);
}

declare global {
  interface HTMLElementTagNameMap {
    'formy-slash-menu': FormySlashMenu;
  }
}
