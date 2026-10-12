/**
 * Example extension: the Signature component's canvas preview.
 *
 * This file is built on its own (dist/extensions/signature-preview.js) and
 * attached through the 'formy/signature_preview' library that the PHP
 * component names in its attribute. It depends on the editor only through
 * the types in sdk.ts: that is all an extension in another module needs.
 */
import { html, LitElement, nothing } from 'lit';
import type { BlockPreviewElement, ComponentDefinition, Settings } from '../sdk';

export class FormySignaturePreview extends LitElement implements BlockPreviewElement {
  static properties = {
    definition: { attribute: false },
    settings: { attribute: false },
  };

  declare definition: ComponentDefinition;
  declare settings: Settings;

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  protected render() {
    return html`
      <div class="formy-signature">
        <svg class="formy-signature__ink" viewBox="0 0 240 60" aria-hidden="true">
          <path d="M8 42c18-4 22-30 34-30s4 34 18 34 12-22 24-22 6 16 18 16 14-12 26-12 8 8 22 8"
            fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="formy-signature__line">
          <span>✕</span>
          <span class="formy-signature__hint">Respondents sign here with a finger or mouse${this.settings?.required ? nothing : ' (optional)'}</span>
        </div>
      </div>`;
  }
}

if (!customElements.get('formy-signature-preview')) {
  customElements.define('formy-signature-preview', FormySignaturePreview);
}
