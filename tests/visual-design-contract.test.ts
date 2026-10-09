import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('current neutral palette is the sole documented source, not the retired warm tokens', () => {
  const tokens = src('src/styles/tokens.css');
  const design = src('.agents/design.md');
  assert.match(tokens, /--background: #FEFEFE/);
  assert.match(tokens, /--background: #080808/);
  assert.match(tokens, /--accent-strong: #465C9A/);
  assert.match(design, /current canonical contract/);
  assert.doesNotMatch(design, /Canvas \| `#FAFAF9`/);
  assert.equal((tokens.match(/--space-1:/g) ?? []).length, 1);
  assert.equal((tokens.match(/--font-body:/g) ?? []).length, 1);
});

test('Today has a distinct primary action while back navigation stays a semantic link', () => {
  const today = src('src/components/pages/TodayPage.tsx');
  const action = src('src/components/ui/ActionLink.tsx');
  const global = src('src/styles/global.css');
  assert.match(today, /variant="primary"/);
  assert.match(action, /variant\?: 'default' \| 'primary'/);
  assert.match(global, /Shared back navigation/);
  assert.doesNotMatch(src('src/layouts/AppLayout.astro'), /topbar-workspace/);
});

test('retired sidecar grids cannot override single-column runtime workspaces', () => {
  const css = src('src/styles/workspace.css');
  assert.doesNotMatch(css, /grid-template-areas: "main side"/);
  assert.doesNotMatch(css, /\.today-workbench,\s*\.progress-workbench\s*\{/);
  assert.match(css, /\.today-workbench \{ display:block/);
  assert.match(css, /Mobile separates the primary stage switcher/);
});

test('metadata minimum and connected-item list use current typography', () => {
  for (const path of ['src/styles/project.css', 'src/styles/integration.css',
    'src/styles/review.css', 'src/styles/connections.css']) {
    const css = src(path);
    assert.doesNotMatch(css, /font-size:\s*(?:8|9|10|11)px/, path);
  }
});
