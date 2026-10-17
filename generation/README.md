# CS-101 generation pipeline

The old published lesson files, staging bundles, generation records and question banks have been cleared. Code, templates and validators remain available.

After importing a reviewed curriculum, run `pnpm generation:prepare <ITEM-ID>`, author the required source pack, lesson specification and MDX, then run `pnpm generation:validate <ITEM-ID>`, `pnpm generation:promote <ITEM-ID>` and `pnpm ci`.

New lessons follow Pedagogy V3: small objectives, worked examples, optional hints, independent challenges, criterion coverage and verified project links. No learner progress or review scheduling is introduced.

## M3 content verification

For new V3 lessons, author `source-pack.json` with a claim ledger mapping each concept ID to an inspected source URL, section locator, and explanation. Include `executable-examples.json` plus reviewed fixtures in `generation/staging/<ID>/fixtures/`. Node `.mjs` and Java `.java` examples run against exact stdout; otherwise use `examples: []` with a justified `noExecutableReason` (explicitly marked not executable). 

The MDX template now imports the promoted pedagogy record and question bank instead of copying either inline. Validation/promotion produce SHA-256 release receipts, and `pnpm validate` re-checks receipt integrity and executes published fixtures. Source claims remain human-reviewed; SQL/PostgreSQL execution is not yet supported.

## M5 — Curriculum rollout

Eight domain sheets are now represented in `curriculum/source/engineering-2026-10-18.json`: 370 scoped units in 67 modules, with source URLs, authentic challenge tasks and P0/P1/P2 priorities. The resulting `curriculum/manifest.v2.json` is a catalogue of outlines only, not a set of generated lessons. No project checkpoint or hard prerequisite is invented from row adjacency.

Run `pnpm curriculum:verify-import` to verify source-to-manifest parity or `pnpm curriculum:status` to see how many P0/P1/P2 units remain unpublished in each track. Generate authored MDX one reviewed unit at a time using the M1–M4 V3 pipeline. The current state deliberately includes no mass-published lesson text or fabricated quizzes; the content-quality gate still applies.

## Focused lesson layout gate (post PR #39)

All published lessons use **Pedagogy V3 only** and exactly three `LessonStage` wrappers in order: `understand`, `practice`, `evidence`. Mental models, concept graphs, worked examples and complete technical `SourceList` belong to **Materi**; guided practice and quiz to **Soal**; `Challenge`, `ExitCriteria` and project bridge to **Project**. The validator enforces the contract at generation and published-content checks. Old Pedagogy V1/V2 metadata is not supported; re-author source data into V3 before publishing. No authored lessons currently exist in production.

For outline-only units, the Materi follow-up CTA skips empty Soal and goes directly to the workbook project idea. Direct `&view=soal` still displays an honest unavailable state. No learning state or new page route is introduced.
