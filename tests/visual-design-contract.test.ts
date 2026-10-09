import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

test('Curriculum module rows show progress without duplicate inline CTA copy', () => {
  const page = src('src/components/pages/CurriculumPage.tsx');
  assert.match(page, /<small>\{module\.completed\}\/\{module\.total\} selesai<\/small>/);
  assert.doesNotMatch(page, /selesai · Buka materi pertama/);
  assert.match(src('src/styles/workspace.css'), /\.progress-integration-copy code \{ width: max-content/);
});


test('block layouts use one neutral visual grammar rather than a floating demo card', () => {
  const workspace = src('src/styles/workspace.css');
  const prose = src('src/styles/global.css');
  const curriculum = src('src/styles/curriculum.css');
  assert.match(workspace, /\.today-focus \{[\s\S]*?background:transparent/);
  assert.match(prose, /\.prose \{ min-width:0; font-size:16px; line-height:1\.65; \}/);
  assert.doesNotMatch(curriculum, /\.module-tree,\.integration-list/);
  assert.doesNotMatch(curriculum, /\.challenge-preview \{/);
});

test('retired demo route and unused interactive card are not bundled', () => {
  const url = (path: string) => new URL('../' + path, import.meta.url);
  for (const path of ['src/pages/demo.astro', 'src/content/lessons/demo.mdx',
    'src/components/arc/card/card.tsx', 'src/components/arc/card/card.module.css']) {
    assert.equal(existsSync(url(path)), false, path);
  }
});

test('unavailable content and review are disclosed, not fake completion actions', () => {
  const curriculum = src('src/components/pages/CurriculumPage.tsx');
  const lesson = src('src/components/pages/LessonPage.tsx');
  const progress = src('src/pages/progress.astro');
  assert.match(curriculum, /item-outline-status/);
  assert.match(lesson, /Latihan manual/);
  assert.match(progress, /unavailableReviewCount/);
});
