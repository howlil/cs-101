import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('Jakarta Sans loads globally with a bundled-system fallback', () => {
  const tokens = read('src/styles/tokens.css');
  const layout = read('src/layouts/AppLayout.astro');
  assert.match(tokens, /--font-body:\s*"Plus Jakarta Sans"/);
  assert.match(tokens, /--font-display:\s*"Plus Jakarta Sans"/);
  assert.match(layout, /fonts\.googleapis\.com\/css2\?family=Plus\+Jakarta\+Sans/);
  assert.match(layout, /data-accent="neutral"/);
});

test('content navigation retains UIArc motion and reduced-motion alternative', () => {
  const layout = read('src/layouts/AppLayout.astro');
  const styles = read('src/styles/library.css');
  const accordion = read('src/components/arc/accordion/accordion.tsx');
  assert.match(layout, /fade\(\{duration:'0\.26s'\}\)/);
  assert.match(styles, /@keyframes library-content-enter/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(accordion, /motionTokens\.spring\.smooth/);
  assert.match(accordion, /useReducedMotion/);
});
