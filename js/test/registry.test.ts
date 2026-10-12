import { describe, expect, it } from 'vitest';
import { ComponentRegistry } from '../src/registry';
import type { ComponentDefinition } from '../src/sdk';

const def = (id: string, label: string, weight: number, extra: Partial<ComponentDefinition> = {}): ComponentDefinition => ({
  id, label, weight, description: '', category: 'Questions', icon: 'text', preview: 'text',
  previewElement: null, settingsEditor: null, insertable: true, schema: {}, defaults: {}, ...extra,
});

describe('ComponentRegistry', () => {
  const registry = new ComponentRegistry([
    def('email', 'Email', 2),
    def('short_text', 'Short answer', 0),
    def('signature', 'Signature', 20, { previewElement: 'x-sig', description: 'Sign with a finger' }),
    def('hidden', 'Hidden', 1, { insertable: false }),
  ]);

  it('orders by weight and hides non-insertable components from search', () => {
    expect(registry.search('').map((d) => d.id)).toEqual(['short_text', 'email', 'signature']);
  });

  it('ranks label prefix matches first, then description matches', () => {
    expect(registry.search('s').slice(0, 2).map((d) => d.id)).toEqual(['short_text', 'signature']);
    expect(registry.search('ign').map((d) => d.id)).toEqual(['signature']);
    expect(registry.search('finger').map((d) => d.id)).toEqual(['signature']);
    expect(registry.search('zzz')).toEqual([]);
  });

  it('lists custom element tags', () => {
    expect(registry.customElementTags()).toEqual(['x-sig']);
  });
});
