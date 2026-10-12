import { describe, expect, it } from 'vitest';
import { KEY_PATTERN, slugify, uniqueKey } from '../src/keys';

describe('keys', () => {
  it('slugifies labels into valid keys', () => {
    expect(slugify("What's your e-mail?")).toBe('what_s_your_e_mail');
    expect(slugify('2024 budget')).toBe('budget');
    expect(slugify('Été')).toBe('ete');
    expect(slugify('日本')).toBe('');
    expect(slugify('x'.repeat(80))).toHaveLength(48);
  });

  it('makes keys unique and falls back when the label has no letters', () => {
    const taken = new Set(['name']);
    expect(uniqueKey('Name', 'short_text', taken)).toBe('name_2');
    expect(uniqueKey('日本', 'short_text', taken)).toBe('short_text');
    expect(uniqueKey('', '', taken)).toBe('field');
    for (const key of taken) expect(key).toMatch(KEY_PATTERN);
  });
});
