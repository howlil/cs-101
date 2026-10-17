# CS-101 engineering content library

Purpose: publish a single-page catalogue of high-quality engineering materials, practice questions, and project ideas. This is **not** a learning-progress application.

## Product invariant

- `/` is the only content page; `?item=ID` selects the material and `?track=ID` selects the domain.
- Sidebar reuses the domain selector and module accordion. No search field, global search button or command palette. Never add Today, progress, study sessions, reviews, evidence forms, or mandatory reflection UI.
- Authored content is MDX at `src/content/lessons`. Quiz feedback is local/ephemeral and never persisted.
- Unauthored items must say they are outlines and **must not fabricate explanations or generated questions**.
- Checkpoints and integration challenges come from the canonical manifest.
- The app has no D1 binding. Never mutate the retired learning database as part of build or deploy.

## Source of truth and authoring

- `curriculum/manifest.v2.json`: domains, modules, topics, prerequisites, checkpoint ideas.
- `.agents/skill/course-generator/SKILL.md`: generate one unit at a time.
- `generation/`: metadata and authoring provenance.
- `review-banks/`: authored self-check question sets; there is no scheduling backend.

## Verification

```sh
pnpm ci
node scripts/validate-css.mjs
```

Maintain content fidelity, mobile sidebar navigation, direct-link selection, and read-only rendering. Retired `/learn/:id`, `/project/:id`, `/integration/:id`, `/review/:id`, `/curriculum`, `/progress` URLs redirect to `/`. Do not resurrect old routes or persistence.

## M5 — Eight-domain source snapshot

The reviewed workbook snapshot `curriculum/source/engineering-2026-10-18.json` maps into 8 tracks, 67 modules and 370 source-backed **outlines**, not completed lessons. Priorities are 225 P0, 123 P1 and 22 P2. `pnpm curriculum:verify-import` detects source/manifest drift, and `pnpm curriculum:status` reports published coverage by domain.

No standalone checkpoint or hard prerequisite may be inferred solely from row order: the workbook did not supply verified graph edges. Unit challenges are source-authored project ideas, not proof that standalone projects have been implemented. Publish P0 units gradually with the V3 source, quiz and executable-proof pipeline. Never present 370 imported outlines as 370 validated lessons or enable learner tracking.
