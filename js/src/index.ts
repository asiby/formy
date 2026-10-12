/**
 * Entry point. In Drupal, a behavior mounts the editor on every
 * [data-formy-editor] element using drupalSettings.formy. Outside Drupal
 * (demo, tests), call window.Formy.mount(element, config).
 */
import './app';
import type { FormyApp } from './app';
import type { FormyConfig } from './sdk';

export function mount(element: HTMLElement, config: FormyConfig): FormyApp {
  const app = document.createElement('formy-app');
  app.config = config;
  element.replaceChildren(app);
  return app;
}

declare global {
  interface Window {
    Formy: { mount: typeof mount };
    Drupal?: { behaviors: Record<string, { attach: (context: Element | Document, settings: { formy?: FormyConfig }) => void }> };
    once?: (id: string, selector: string, context: Element | Document) => HTMLElement[];
  }
}

window.Formy = { mount };

if (window.Drupal && window.once) {
  const once = window.once;
  window.Drupal.behaviors.formy = {
    attach(context, settings) {
      if (!settings.formy) return;
      for (const element of once('formy', '[data-formy-editor]', context)) {
        mount(element, settings.formy);
      }
    },
  };
}
