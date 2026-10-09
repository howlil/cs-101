# Recommended `cs-101` Repository Architecture

> **Reference scope (October 2026):** The tree below shows **current ownership**, with upcoming relocations clearly marked. It is **not** permission to implement planned folder moves early. The authoritative rules are [`AGENTS.md`](../../../../AGENTS.md) and [`.agents/engineering-design.md`](../../../engineering-design.md); the staged file moves are in [`.agents/refactoring-plan.md`](../../../refactoring-plan.md). Until the UI relocation PR is merged, authored lessons and the generator template **must keep importing** `src/components/course/*.astro`. After migration, update all lesson/template paths together; do not invent or keep parallel `course/` and `lesson/` implementations.


Use Astro as the renderer and content system. Generated lessons should be MDX/content entries that compile to HTML, not hand-authored standalone HTML documents.

```text
cs-101/                 # Current layout; do not pre-apply planned moves
├── curriculum/         # manifest.v2.json + import records
├── generation/         # generation records / provenance
├── review-banks/       # assessment banks
├── scripts/            # generation and validation pipeline
├── migrations/         # SQLite / D1
├── src/
│   ├── content/lessons/                # authored/generated MDX
│   ├── components/course/              # MDX blocks (current; planned → lesson/)
│   ├── components/ui/QuizClient.tsx    # planned → lesson/
│   ├── components/ui/RevealAccordion.tsx
│   ├── components/learning/            # progress/evidence UI
│   ├── domain/{curriculum-v2,learning,generation,review}/
│   ├── server/                         # learning runtime and persistence
│   ├── layouts/AppLayout.astro
│   └── pages/                          # Astro file-based routes
└── .agents/refactoring-plan.md        # staged path migrations
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

The generated MDX is a cache/artifact. `curriculum/manifest.v2.json` is the current normalized curriculum specification; `curriculum/manifest.json` exists for compatibility.

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
