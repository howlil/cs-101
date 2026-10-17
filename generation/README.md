# CS-101 generation pipeline

The old published lesson files, staging bundles, generation records and question banks have been cleared. Code, templates and validators remain available.

After importing a reviewed curriculum, run `pnpm generation:prepare <ITEM-ID>`, author the required source pack, lesson specification and MDX, then run `pnpm generation:validate <ITEM-ID>`, `pnpm generation:promote <ITEM-ID>` and `pnpm ci`.

New lessons follow Pedagogy V2: small objectives, worked examples, optional hints, independent challenges, criterion coverage and verified project links. No learner progress or review scheduling is introduced.
