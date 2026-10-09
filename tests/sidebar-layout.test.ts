import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('the shell has one route-aware curriculum explorer owner', () => {
  const layout = source('src/layouts/AppLayout.astro');
  const curriculum = source('src/components/pages/CurriculumPage.tsx');
  const sidebar = source('src/components/app/AppSidebar.tsx');
  assert.match(layout, /<AppSidebar client:load/);
  assert.doesNotMatch(layout, /AppNavigation|ContextualCurriculumSidebar/);
  assert.doesNotMatch(curriculum, /CurriculumExplorer|curriculum-shell/);
  assert.match(sidebar, /<CurriculumExplorer/);
  assert.match(sidebar, /<DialogContent/);
  assert.match(sidebar, /SCROLL_PREFIX/);
});

test('curriculum deep links and learning route links stay distinct', () => {
  const layout = source('src/layouts/AppLayout.astro');
  assert.match(layout, /curriculumRoute \? previewHref\(item\) : itemHref\(curriculumGraph, item\.id\)/);
  assert.match(layout, /selectedModuleId: selectedLocation\?\.module\?\.id/);
  assert.match(layout, /snapshotForRequest\(Astro\.locals\)/);
  assert.match(layout, /Cache-Control', 'no-store'/);
});

test('Howlil accent wins over Arc blue preset in light and dark themes', () => {
  const css = source('src/styles/tokens.css');
  assert.match(css, /:root\[data-accent="blue"\]/);
  assert.match(css, /:root\[data-theme="dark"\]\[data-accent="blue"\]/);
  assert.match(css, /--accent:#9BB1FF/);
});


test('mobile drawer styles match the rendered Dialog class', () => {
  const sidebar = source('src/components/app/AppSidebar.tsx');
  const css = source('src/styles/app-sidebar.css');
  assert.match(sidebar, /className="sidebar-mobile-dialog"/);
  assert.match(css, /\.sidebar-mobile-dialog \{/);
  assert.doesNotMatch(css, /\.mobile-sidebar-dialog/);
  assert.match(css, /\.sidebar-mobile-dialog \.sidebar-scroll/);
});

test('curriculum detail has one page main and no old explorer layout', () => {
  const curriculum = source('src/components/pages/CurriculumPage.tsx');
  const styles = source('src/styles/curriculum.css');
  assert.doesNotMatch(curriculum, /<main(?:\s|>)/);
  assert.match(curriculum, /<Accordion/);
  assert.match(curriculum, /className="item-state-actions"/);
  assert.doesNotMatch(styles, /\.curriculum-shell\b/);
  assert.doesNotMatch(styles, /\.curriculum-explorer\b/);
});

test('curriculum link retains selected track and item position', () => {
  const layout = source('src/layouts/AppLayout.astro');
  const sidebar = source('src/components/app/AppSidebar.tsx');
  const explorer = source('src/components/curriculum/CurriculumExplorer.tsx');
  assert.match(layout, /curriculumHref,/);
  assert.match(layout, /position: \{ index: index \+ 1, total: module\.items\.length \}/);
  assert.match(sidebar, /href=\{href === '\/curriculum' \? curriculumHref : href\}/);
  assert.match(explorer, /item\.position\.index/);
  assert.match(source('src/pages/curriculum.astro'), /Astro\.url\.searchParams\.has\('track'\)/);
});


test('browse overview is distinct from a selected-item preview', () => {
  const route = source('src/pages/curriculum.astro');
  const page = source('src/components/pages/CurriculumPage.tsx');
  const layout = source('src/layouts/AppLayout.astro');
  assert.match(route, /const selectedItem = requestedItem;/);
  assert.match(route, /const trackOverview = explorer/);
  assert.match(page, /className="curriculum-overview-modules"/);
  assert.match(layout, /const selectedItem = currentItem;/);
  assert.match(layout, /completed: module\.items\.filter/);
  assert.match(source('src/components/curriculum/CurriculumExplorer.tsx'), /module\.completed \+ '\/' \+ module\.items\.length/);
});
