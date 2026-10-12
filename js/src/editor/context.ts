import type { ComponentRegistry } from '../registry';

/**
 * What the canvas needs from the app around it. The app implements it; node
 * views and plugins only see this interface.
 */
export interface EditorContext {
  readonly registry: ComponentRegistry;

  /** The block whose settings panel is open, if any. */
  activeBlockId(): string | null;
  activate(blockId: string | null): void;

  /** Error messages to show on a block after a failed save. */
  messagesFor(blockId: string): string[];

  /**
   * TRUE once for a block that was just inserted, so its view focuses its
   * label input.
   */
  takeFocusRequest(blockId: string): boolean;
  requestFocus(blockId: string): void;

  /** Notifies views that the state above changed. */
  subscribe(listener: () => void): () => void;
}
