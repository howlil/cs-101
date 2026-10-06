# Recommended `cs-101` Repository Architecture

Use Astro as the renderer and content system. Generated lessons should be MDX/content entries that compile to HTML, not hand-authored standalone HTML documents.

```text
cs-101/
├─ AGENTS.md
├─ astro.config.mjs
├─ package.json
├─ tsconfig.json
├─ skills/
│  └─ course-generator/
│     ├─ SKILL.md
│     ├─ references/
│     └─ assets/
├─ curriculum/
│  ├─ manifest.json              # normalized source-of-truth snapshot
│  └─ schema.ts
├─ generation/
│  └─ <TASK-ID>.json             # provenance/fingerprint/validation
├─ learning/
│  ├─ state.json                 # active task + review state
│  └─ sessions.jsonl             # append-only learning evidence
├─ scripts/
│  ├─ sync-curriculum.ts
│  ├─ generate-course.ts
│  └─ validate-course.ts
├─ src/
│  ├─ content.config.ts
│  ├─ content/
│  │  └─ lessons/
│  │     ├─ java/
│  │     │  └─ JAV-001.mdx
│  │     └─ db-sql/
│  │        └─ SQL-001.mdx
│  ├─ components/
│  │  └─ course/
│  │     ├─ MentalModel.astro
│  │     ├─ ConceptGraph.astro
│  │     ├─ Quiz.astro
│  │     ├─ Challenge.astro
│  │     ├─ ExitCriteria.astro
│  │     ├─ SourceList.astro
│  │     ├─ ContinueFrom.astro
│  │     ├─ SessionLogger.astro
│  │     ├─ ReviewMode.astro
│  │     └─ Reveal.astro
│  ├─ layouts/
│  │  └─ LessonLayout.astro
│  └─ pages/
│     ├─ index.astro
│     ├─ learn/[id].astro
│     ├─ review/[id].astro
│     └─ progress.astro
└─ public/
```

## Data ownership

```text
Curriculum source
      ↓ sync
curriculum/manifest.json
      ↓ generate one Task ID
src/content/lessons/**/<TASK-ID>.mdx
      ↓ Astro
HTML course page
```

The generated MDX is a cache/artifact. `curriculum/manifest.json` remains the local specification snapshot.

## Why MDX instead of raw HTML

MDX gives generated lessons structured metadata and reusable interactive course components while Astro still produces HTML for the browser.

This prevents each generated lesson from inventing its own:

- navigation;
- typography;
- quiz markup;
- challenge layout;
- source formatting;
- progress UI;
- responsive behavior.

## Suggested content frontmatter

```yaml
id: SQL-001
track: db-sql
phase: 1
order: 1
title: Relational model + PostgreSQL fundamentals
status: generated
prerequisites: []
sourceVersion: postgresql-18
curriculumFingerprint: sha256:...
generatedAt: 2026-10-06T00:00:00Z
```

## Generation metadata

Keep provenance outside the lesson body:

```json
{
  "taskId": "SQL-001",
  "curriculumFingerprint": "sha256:...",
  "sources": [],
  "coverage": {},
  "validator": {
    "passed": true,
    "issues": []
  }
}
```

## UI state vs learning state

Do not confuse these:

- `generated`: lesson artifact exists;
- `started`: learner has opened/recorded work;
- `passed`: original exit criteria have evidence;
- `review_due`: spaced recall is due.

The website can display learning state, but generation must never automatically mark a task passed.
