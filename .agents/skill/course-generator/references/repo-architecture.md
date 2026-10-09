# Recommended `cs-101` Repository Architecture

> **Current vs future:** This document must follow the active [architecture contract](../../../architecture.md) and [UI refactoring plan](../../../refactoring-plan.md). `src/components/lesson/*.astro` owns authored MDX blocks and quiz/reveal islands. Session/evidence/review TSX remain under `components/course` until the learning-ownership PR. The server already uses `src/server/learning/{contract,sqlite,d1}.ts`.

Use Astro as the renderer and content system. Generated lessons should be MDX/content entries that compile to HTML, not hand-authored standalone HTML documents.

```text
cs-101/                       # Current layout, not future structure
├── curriculum/               # manifest.v2.json
├── generation/               # provenance records
├── review-banks/             # quiz/review artifacts
├── scripts/                  # generate / validate / promote
├── migrations/               # SQLite + D1 migrations
├── src/
│   ├── content/lessons/       # MDX content
│   ├── components/lesson/     # current MDX blocks and quiz/reveal islands
│   ├── components/course/     # temporary session/evidence/review TSX
│   ├── components/learning/   # current evidence/activation UI
│   ├── domain/                # curriculum graph + learning/review/generation
│   ├── server/learning/       # contract.ts, sqlite.ts, d1.ts (already refactored)
│   ├── layouts/              # Astro application layout
│   └── pages/                # Astro file-based routing
└── .agents/refactoring-plan.md
```
## Data ownership

```text
Curriculum source
      ↓ sync
curriculum/manifest.v2.json
      ↓ generate one Item ID
src/content/lessons/**/<TASK-ID>.mdx
      ↓ Astro
HTML course page
```

The generated MDX is a cache/artifact. `curriculum/manifest.v2.json` is the current curriculum specification; `curriculum/manifest.json` is retained for V1 compatibility.

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
taskId: SQL-001
title: Relational model + PostgreSQL fundamentals
description: Mental model relational + PostgreSQL fundamentals.
demo: false
curriculumFingerprint: sha256:...
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
