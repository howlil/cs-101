# CS-101 Engineering

## Responsibilities
R1: Existing manifest is canonical for all unit IDs, source references and lesson fingerprints.
R2: The curated overlay adds semantic concept links without changing source imports.
R3: Astro composes immutable graph data and renders server-selected URL views.
S1: Overlay JSON is immutable; URL query params own mode and selected concept.
K1: src/domain/learning-graph.ts validates and indexes the overlay.
K2: src/components/curriculum/KnowledgeGraph.astro renders accessible concept neighborhoods.
K3: src/pages/index.astro selects mode; no new routes, databases or runtime dependencies.

## Flow and guarantees
/?mode=graph -> parse and validate overlay against manifest -> focus concept -> link canonical /?item=ID -> return to concept.
Unknown selection -> valid default focus; invalid overlay -> fail build rather than silently omit.
G1: Only explicitly reviewed requires edges may represent hard prerequisites.
G2: Workbook importer remains deterministic and untouched.
DEC1: JSON overlay + in-memory adjacency preferred to changing generated manifest or adding graph DB.
D1: Pilot proposed relationships require editorial review before promotion to reviewed.

## Verification
PF1 (P1,P2) [important] | selectors + unknown concept fallback | iter/pr | pnpm test
PF2 (P3,P4) [important] | validation, cycle and manifest integrity | iter/pr | pnpm test
PF3 (P1,P3) [important] | existing Astro build and smoke gate | merge | pnpm ci
