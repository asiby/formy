/**
 * Formy public types: the contract between Drupal, the editor and any
 * module that extends the editor with its own custom elements.
 *
 * Keep this file free of runtime code so extension authors can depend on it
 * for types only.
 */

/** Kinds of setting a component can declare (see FormyComponentInterface). */
export type SettingType = 'string' | 'text' | 'boolean' | 'integer' | 'enum' | 'options';

/** One setting in a component's schema. Mirrors the PHP schema array. */
export interface SettingSchema {
  type: SettingType;
  title: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  minItems?: number;
  /** For enum settings: value => label. */
  enum?: Record<string, string>;
  /** 'advanced' settings are collapsed in the settings panel. */
  group?: 'main' | 'advanced';
  /** Edited directly on the canvas (e.g. the question label). */
  inline?: boolean;
}

export type Settings = Record<string, unknown>;

/** A choice in an 'options' setting. */
export interface ChoiceOption {
  value: string;
  label: string;
}

/** What the server tells the editor about a component (getClientDefinition). */
export interface ComponentDefinition {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  /** Built-in canvas preview: text, textarea, email, number, date, radios, ... */
  preview: string;
  /** Custom element tag replacing the built-in preview, if any. */
  previewElement: string | null;
  /** Custom element tag replacing the generated settings panel, if any. */
  settingsEditor: string | null;
  insertable: boolean;
  weight: number;
  schema: Record<string, SettingSchema>;
  defaults: Settings;
}

/** Block type the server uses for elements Formy cannot edit. */
export const ADVANCED = '_advanced';

/** One block of a Formy document. */
export interface FormyBlock {
  id: string;
  type: string;
  key: string;
  settings: Settings;
}

/** The document exchanged with the server. */
export interface FormyDocument {
  version: 1;
  blocks: FormyBlock[];
}

export interface DocumentMeta {
  revision: string;
  hasSubmissions: boolean;
  webform: { id: string; title: string; status: 'open' | 'closed' };
}

export interface Violation {
  /** e.g. "blocks.2.settings.label", or an element key. */
  path: string;
  message: string;
}

/**
 * Contract for a custom settings editor (like Angular's ControlValueAccessor).
 *
 * Register a custom element implementing it and name its tag in the
 * component's #[FormyComponent(settings_editor: '...')] attribute. Formy
 * creates the element, then:
 * - sets `definition`,
 * - calls writeValue() whenever the block's settings change elsewhere,
 * - calls registerOnChange() once; call that function with the complete new
 *   settings whenever the user edits something.
 */
export interface SettingsAccessor<S extends Settings = Settings> extends HTMLElement {
  definition?: ComponentDefinition;
  writeValue(settings: S): void;
  registerOnChange(fn: (settings: S) => void): void;
  setDisabledState?(disabled: boolean): void;
}

/**
 * Contract for a custom canvas preview.
 *
 * Name its tag in #[FormyComponent(preview_element: '...')]. Formy sets the
 * two properties on every change. Previews are rendered inert: they are
 * pictures of the field, not working inputs.
 */
export interface BlockPreviewElement<S extends Settings = Settings> extends HTMLElement {
  definition: ComponentDefinition;
  settings: S;
}

/** What Drupal passes to the editor (drupalSettings.formy). */
export interface FormyConfig {
  webformId: string;
  endpoints: {
    components: string;
    load: string;
    save: string;
    csrfToken: string;
  };
  links: {
    view: string;
    build: string;
  };
}
