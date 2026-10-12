import type { ComponentDefinition } from './sdk';

/** The component palette, as loaded from the server. */
export class ComponentRegistry {
  private readonly byId = new Map<string, ComponentDefinition>();

  constructor(definitions: ComponentDefinition[]) {
    const sorted = [...definitions].sort((a, b) => a.weight - b.weight || a.label.localeCompare(b.label));
    for (const definition of sorted) {
      this.byId.set(definition.id, definition);
    }
  }

  get(id: string): ComponentDefinition | undefined {
    return this.byId.get(id);
  }

  all(): ComponentDefinition[] {
    return [...this.byId.values()];
  }

  /** Components for the "/" menu matching a query, best matches first. */
  search(query: string): ComponentDefinition[] {
    const q = query.trim().toLowerCase();
    const insertable = this.all().filter((d) => d.insertable);
    if (!q) {
      return insertable;
    }
    const score = (d: ComponentDefinition): number => {
      const label = d.label.toLowerCase();
      if (label.startsWith(q)) return 0;
      if (label.includes(q)) return 1;
      if (d.id.includes(q) || d.description.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)) return 2;
      return -1;
    };
    return insertable
      .map((d) => ({ d, s: score(d) }))
      .filter(({ s }) => s >= 0)
      .sort((a, b) => a.s - b.s || a.d.weight - b.d.weight)
      .map(({ d }) => d);
  }

  /** Custom element tags components rely on (previews and settings editors). */
  customElementTags(): string[] {
    const tags = new Set<string>();
    for (const d of this.all()) {
      if (d.previewElement) tags.add(d.previewElement);
      if (d.settingsEditor) tags.add(d.settingsEditor);
    }
    return [...tags];
  }
}
