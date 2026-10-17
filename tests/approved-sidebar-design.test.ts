import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=(path:string)=>readFileSync(path,'utf8');
test('sidebar preview hierarchy is domain → curriculum → module → lessons',()=>{
  const jsx=source('src/components/curriculum/CurriculumExplorer.tsx');
  assert.ok(jsx.indexOf('Select label="DOMAIN"') < jsx.indexOf('Materi</p>'));
  assert.ok(jsx.indexOf('Materi</p>') < jsx.indexOf('<Accordion'));
  assert.doesNotMatch(jsx,/meta: module\.items\.length/);
  assert.doesNotMatch(jsx,/CurriculumSearch|searchEntries|CommandPalette/);
});
test('approved desktop and mobile geometry with UIArc controls',()=>{
  const styles=source('src/styles/app-sidebar.css');
  assert.match(styles,/width:236px/);
  assert.match(styles,/sidebar-mobile-dialog/);
  assert.doesNotMatch(styles,/sidebar-footer/);
  const accordion=source('src/components/arc/accordion/accordion.tsx');
  assert.match(accordion,/motionTokens\.spring\.smooth/);
  assert.match(accordion,/meta\?: string \| number/);
});
test('single content page keeps Jakarta Sans, monochrome and motion',()=>{
  const tokens=source('src/styles/tokens.css');
  const lib=source('src/styles/library.css');
  assert.match(tokens, /--font-body: "Plus Jakarta Sans"/);
  assert.match(tokens, /--accent: #111111/);
  assert.match(lib, /@keyframes library-content-enter/);
  assert.match(lib, /prefers-reduced-motion: reduce/);
});
