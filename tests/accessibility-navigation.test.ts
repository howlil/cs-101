import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('keyboard-visible focus cannot be globally disabled', () => {
  const foundation = read('src/components/arc/foundation.css');
  const tokens = read('src/styles/tokens.css');
  assert.doesNotMatch(foundation, /:is\(\*:focus|outline:\s*none\s*!important/);
  assert.match(foundation, /:focus-visible\s*\{/);
  assert.match(foundation, /outline:\s*2px solid var\(--focus-ring\)/);
  assert.match(tokens, /--focus-ring:\s*var\(--accent-strong\)/);
});

test('navigation only uses one loading indicator and Astro owns route motion', () => {
  const layout = read('src/layouts/AppLayout.astro');
  const css = read('src/styles/app-shell.css');
  assert.doesNotMatch(layout, /NavigationProgress/);
  assert.match(layout, /dataset\.routeLoading/);
  assert.match(layout, /transition:name="page-workspace"/);
  assert.doesNotMatch(css, /navigation-progress|cs101-workspace/);
  assert.match(css, /html\[data-route-loading="true"\] \.topbar::after/);
});
