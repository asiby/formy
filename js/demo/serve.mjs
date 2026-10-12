// Demo server: serves the built editor with a mock Formy API, so the editor
// can be tried and tested without Drupal.
//
//   npm run demo            -> http://localhost:8787/demo/
//   PORT=9000 npm run demo
//
// The mock mimics ApiController's responses (ids, revisions, 422/409
// errors). The fixtures were produced by the real PHP DocumentConverter.
// Open /demo/?responses=1 to simulate a form that already has responses.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtures = join(root, 'demo', 'fixtures');
const components = JSON.parse(await readFile(join(fixtures, 'components.json'), 'utf8'));
const initial = JSON.parse(await readFile(join(fixtures, 'document.json'), 'utf8'));
const TOKEN = 'demo-token';
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const NON_INPUT = new Set(['heading', 'paragraph']);

let state = { document: structuredClone(initial), revision: 1, hasSubmissions: false };

const meta = () => ({
  revision: String(state.revision),
  hasSubmissions: state.hasSubmissions,
  webform: { id: 'workshop', title: 'Spring workshop registration', status: 'open' },
});

function validate(document) {
  const violations = [];
  const keys = new Set();
  const known = new Set(components.components.map((c) => c.id));
  const saved = new Map(state.document.blocks.map((b) => [b.key, b]));
  document.blocks.forEach((block, i) => {
    if (!KEY_PATTERN.test(block.key ?? '')) violations.push({ path: `blocks.${i}.key`, message: 'Keys use lowercase letters, digits and underscores, and start with a letter.' });
    else if (keys.has(block.key)) violations.push({ path: `blocks.${i}.key`, message: `The key "${block.key}" is used twice.` });
    keys.add(block.key);
    if (block.type === '_advanced') {
      if (saved.get(block.key)?.type !== '_advanced') violations.push({ path: `blocks.${i}`, message: 'Advanced fields can be moved or removed here, but not created or changed.' });
      return;
    }
    if (!known.has(block.type)) violations.push({ path: `blocks.${i}.type`, message: `Unknown component "${block.type}".` });
    for (const name of ['label', 'text']) {
      if (name in block.settings && !String(block.settings[name]).trim()) violations.push({ path: `blocks.${i}.settings.${name}`, message: 'This cannot be empty.' });
    }
    const options = block.settings.options;
    if (Array.isArray(options) && options.some((o) => !String(o.label).trim())) violations.push({ path: `blocks.${i}.settings.options`, message: 'Every choice needs a label.' });
  });
  return violations;
}

function guard(document) {
  const next = new Map(document.blocks.map((b) => [b.key, b.type]));
  return state.document.blocks
    .filter((b) => !NON_INPUT.has(b.type) && b.type !== '_advanced')
    .filter((b) => !next.has(b.key) || next.get(b.key) !== b.type)
    .map((b) => ({ path: b.key, message: next.has(b.key) ? 'This question already has responses, so its type cannot change.' : 'This question already has responses, so it cannot be removed.' }));
}

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/session/token') return res.end(TOKEN);
  if (url.pathname === '/api/components') return json(res, 200, components);
  if (url.pathname === '/api/reset') {
    state = { document: structuredClone(initial), revision: 1, hasSubmissions: url.searchParams.get('responses') === '1' };
    return json(res, 200, { ok: true });
  }
  if (url.pathname === '/api/webform') {
    if (req.method === 'GET') return json(res, 200, { document: state.document, meta: meta() });
    if (req.headers['x-csrf-token'] !== TOKEN) return json(res, 403, { message: 'Missing CSRF token.' });
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    if (body.revision !== String(state.revision)) return json(res, 409, { error: 'conflict', message: 'This form was changed elsewhere since you opened it. Reload to get the latest version.' });
    const violations = validate(body.document);
    if (violations.length) return json(res, 422, { error: 'invalid', violations });
    if (state.hasSubmissions) {
      const blocked = guard(body.document);
      if (blocked.length) return json(res, 409, { error: 'has_responses', message: 'Some changes would orphan existing responses.', violations: blocked });
    }
    state.document = { version: 1, blocks: body.document.blocks.map((b) => ({ ...b, id: `b_${b.key}` })) };
    state.revision++;
    state.lastSaved = body.document;
    return json(res, 200, { document: state.document, meta: meta() });
  }
  if (url.pathname === '/api/last-saved') return json(res, 200, state.lastSaved ?? null);

  // Static files from js/.
  const path = normalize(join(root, url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname));
  if (!path.startsWith(root)) return json(res, 403, {});
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  }
  catch {
    json(res, 404, { message: 'Not found' });
  }
}).listen(Number(process.env.PORT ?? 8787), () => {
  console.log(`Formy demo: http://localhost:${process.env.PORT ?? 8787}/demo/`);
});
