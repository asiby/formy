/**
 * Element keys and block ids.
 *
 * Keys name a question in Webform and in every stored response, so a key
 * never changes once saved. New questions get a key derived from their
 * label at save time.
 */

/** Must match DocumentConverter::KEY_PATTERN in PHP. */
export const KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

const MAX_BASE_LENGTH = 48;

/** "What's your e-mail?" -> "what_s_your_e_mail". */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/_+$/, '');
}

/** A key based on `text` that is not in `taken` (and adds it to `taken`). */
export function uniqueKey(text: string, fallback: string, taken: Set<string>): string {
  const base = slugify(text) || slugify(fallback) || 'field';
  let key = base;
  for (let i = 2; taken.has(key); i++) {
    key = `${base}_${i}`;
  }
  taken.add(key);
  return key;
}

/** A new, random block id for blocks created in the editor. */
export function newBlockId(): string {
  return `n_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
