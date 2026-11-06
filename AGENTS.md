# CS-101 engineering content library

Purpose: publish a single-page catalogue of high-quality engineering materials, practice questions, and project ideas. This is **not** a learning-progress application.

## Product invariant

- `/` is the only content page; `?item=ID` selects material, `?track=ID` selects a domain, and `?mode=graph&concept=ID&level=G1` selects a read-only level-specific concept neighborhood; optional `?item=ID&concept=ID&level=G1` carries validated study-path context.
- Sidebar reuses the domain selector and module accordion. No search field, global search button or command palette. Never add Today, progress, study sessions, reviews, evidence forms, or mandatory reflection UI.
- Authored content is MDX at `src/content/lessons`. Quiz feedback is local/ephemeral and never persisted.
- Unauthored items must say they are outlines and **must not fabricate explanations or generated questions**.
- Checkpoints and integration challenges come from the canonical manifest.
- The app has no D1 binding. Never mutate the retired learning database as part of build or deploy.

## Source of truth and authoring

- `curriculum/manifest.v2.json`: domains, modules, topics, prerequisites, checkpoint ideas.
- `curriculum/learning-graph.v1.json`: validated curated concept overlay, never inferred hard prerequisites. Proposed edges are discovery links only. Competency outcomes must reference canonical mapped unit IDs; missing levels remain explicit gaps. Suggested item order is not a hard prerequisite; only reviewed `requires` edges are traversed as prerequisites. Rubric criteria must link to their outcome's source units and declare the actual evidence kind (design review, framework test, network lab, packet trace, cluster test, reproducible CLI build or live PostgreSQL test); they are proposed human-review guides, never quizzes or proof of mastery.
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

No standalone checkpoint or hard prerequisite may be inferred solely from row order: the workbook did not supply verified graph edges. Unit challenges are source-authored project ideas, not proof that standalone projects have been implemented. Publish P0 units gradually with the V3 source, quiz and executable-proof pipeline. NET-001, NET-006, SPR-006, OSX-029, PRD-002, JAV-001, SQL-001, TST-007, SYS-008 and TST-019 are authored units; revalidate tracked staging source/spec and promoted artifacts via `pnpm generation:validate <ID>` and `pnpm generation:promote <ID>`. OSX-029's namespace lab is manual, and PRD-002's Node fixture does not run Kubernetes or Spring. SQL-001 cannot run PostgreSQL inside the Node/Java-only V3 fixture runner; it must retain a noExecutableReason, plus pass the separate isolated PostgreSQL 16 CI lab using versioned init.sql and six SELECT queries. Do not claim the generator's not-executable receipt proves SQL behavior. TST-007's JUnit Maven dependency cannot run in the bounded single-file V3 fixture: retain the explicit nonExecutableReason and independently verify a nonzero JUnit 5/Surefire XML report on JDK 21 without any Spring context. SYS-008 is a design-time OpenAPI 3.1.1 contract with a bounded, source-backed Node static checker; it does not prove full OpenAPI conformance, real HTTP/Spring MVC, security controls, idempotent payment, or ledger settlement. TST-019 runs HTTP requests against a Node in-memory server and explicitly marks undeclared 422, not Spring integration proof. Never present 370 imported outlines as 370 validated lessons or enable learner tracking.

## Published lesson view ownership

- `?item=<ID>`: Materi; `&view=soal`: guided practice/quiz; `&view=project`: implementation challenge. Only the active view renders in MDX; links are addressable without learner state.
- All published Pedagogy V3 lessons require exactly three ordered `LessonStage` wrappers, with complete `SourceList` in `understand`, `Quiz` in `practice`, and `Challenge`/verification in `evidence`. Stage layout is checked both before promotion and during every published content validation. No older pedagogy schemas are accepted; previously preserved materials require new V3 review before publication.
- An unauthored outline has no real quiz: its Materi CTA goes directly to Project rather than an empty Soal page. Never manufacture questions from the workbook.
