# CS-101 generation pipeline

The old published lesson files, staging bundles, generation records and question banks have been cleared. Code, templates and validators remain available.

After importing a reviewed curriculum, run `pnpm generation:prepare <ITEM-ID>`, author the required source pack, lesson specification and MDX, then run `pnpm generation:validate <ITEM-ID>`, `pnpm generation:promote <ITEM-ID>` and `pnpm ci`.

New lessons follow Pedagogy V3: small objectives, worked examples, optional hints, independent challenges, criterion coverage and verified project links. No learner progress or review scheduling is introduced.

## M3 content verification

For new V3 lessons, author `source-pack.json` with a claim ledger mapping each concept ID to an inspected source URL, section locator, and explanation. Include `executable-examples.json` plus reviewed fixtures in `generation/staging/<ID>/fixtures/`. Node `.mjs` and Java `.java` examples run against exact stdout; otherwise use `examples: []` with a justified `noExecutableReason` (explicitly marked not executable). 

The MDX template now imports the promoted pedagogy record and question bank instead of copying either inline. Validation/promotion produce SHA-256 release receipts, and `pnpm validate` re-checks receipt integrity and executes published fixtures. Source claims remain human-reviewed; SQL/PostgreSQL execution is not yet supported.
