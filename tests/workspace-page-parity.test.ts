import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('sidebar remains route-aware across Today, Progress and Review', () => {
  const layout = src('src/layouts/AppLayout.astro');
  const sidebar = src('src/components/app/AppSidebar.tsx');
  assert.match(layout, /const showCurriculum = curriculumRoute \|\| Boolean\(contextualMatch\)/);
  assert.doesNotMatch(layout, /reviewMatch/);
  assert.match(layout, /learningState\?\.activeItemId/);
  assert.match(sidebar, /currentPath.startsWith\('\/review\/'\)/);
});

test('all page workspaces use one AppLayout main region', () => {
  for (const page of ['TodayPage', 'ProgressPage', 'ProjectPage', 'IntegrationPage', 'ReviewPage']) {
    const source = src('src/components/pages/' + page + '.tsx');
    assert.doesNotMatch(source, /<main(?:\s|>)/, page + ' introduced a nested main');
  }
  assert.match(src('src/layouts/AppLayout.astro'), /<main[\s\S]*id="main"/);
});

test('Project and Integration keep server evidence forms while disclosing relationships', () => {
  const project = src('src/components/pages/ProjectPage.tsx');
  const integration = src('src/components/pages/IntegrationPage.tsx');
  assert.match(project, /<Accordion/);
  assert.match(project, /<ProjectEvidence/);
  assert.match(project, /<GuaranteeAccordion/);
  assert.match(project, /<ConnectionsPanel/);
  assert.match(integration, /<Accordion/);
  assert.match(integration, /<IntegrationEvidence/);
  assert.match(integration, /<ConnectionsPanel/);
  assert.match(integration, /prerequisites\.filter/);
});

test('Today, Progress and Review retain their critical actions', () => {
  const today = src('src/components/pages/TodayPage.tsx');
  const progress = src('src/components/pages/ProgressPage.tsx');
  const review = src('src/components/pages/ReviewPage.tsx');
  assert.match(today, /primary\.nextStep/);
  assert.match(today, /<ActionLink href=\{primary\.href\}/);
  assert.match(progress, /<Accordion/);
  assert.match(progress, /href=\{'\/review\/' \+ review\.id\}/);
  assert.match(progress, /action="\/api\/export"/);
  assert.match(review, /<ReviewAttempt/);
  assert.match(review, /<ReviewSchedule/);
  assert.match(review, /bank\.current/);
});


test('Project and Integration status use shared learning projection', () => {
  for (const route of ['project', 'integration']) {
    const source = src('src/pages/' + route + '/[id].astro');
    const page = src('src/components/pages/' + (route === 'project' ? 'ProjectPage' : 'IntegrationPage') + '.tsx');
    assert.match(source, /getItemActionState\(getItemLearningView/);
    assert.match(page, /<ItemStatusAction/);
    assert.doesNotMatch(page, /<ActivateItem/);
  }
});
test('Today, Progress, Review do not duplicate the curriculum tree', () => {
  const layout = src('src/layouts/AppLayout.astro');
  assert.match(layout, /const showCurriculum = curriculumRoute \|\| Boolean\(contextualMatch\)/);
  assert.doesNotMatch(layout, /reviewMatch/);
});
