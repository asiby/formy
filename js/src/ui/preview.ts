import { html, nothing, type TemplateResult } from 'lit';
import type { ChoiceOption, ComponentDefinition, Settings } from '../sdk';

/**
 * Built-in canvas previews: pictures of what respondents will see. They are
 * rendered inside an `inert` container, so they never take focus or input.
 *
 * A component can replace its preview with a custom element
 * (#[FormyComponent(preview_element: ...)]); see field-view.ts.
 */
export function renderPreview(definition: ComponentDefinition, settings: Settings): TemplateResult | typeof nothing {
  const placeholder = typeof settings.placeholder === 'string' ? settings.placeholder : '';
  const options = Array.isArray(settings.options) ? (settings.options as ChoiceOption[]) : [];

  switch (definition.preview) {
    case 'text':
    case 'email':
    case 'number':
      return html`<input class="formy-preview-input" type=${definition.preview} placeholder=${placeholder} tabindex="-1">`;

    case 'date':
      return html`<input class="formy-preview-input formy-preview-input--short" type="date" tabindex="-1">`;

    case 'textarea':
      return html`<textarea class="formy-preview-input" rows=${Math.min(Number(settings.rows) || 3, 8)} placeholder=${placeholder} tabindex="-1"></textarea>`;

    case 'radios':
    case 'checkboxes': {
      if (settings.display === 'dropdown') {
        return html`<select class="formy-preview-input formy-preview-input--short" tabindex="-1">
          <option>${options[0]?.label ?? '- Select -'}</option>
        </select>`;
      }
      const type = definition.preview === 'radios' ? 'radio' : 'checkbox';
      return html`<ul class="formy-preview-choices">
        ${options.map((o) => html`<li><input type=${type} tabindex="-1"> <span>${o.label}</span></li>`)}
      </ul>`;
    }

    case 'signature':
      return html`<div class="formy-preview-signature">Sign here</div>`;

    default:
      return html`<div class="formy-preview-generic">${definition.label}</div>`;
  }
}
