# CS-101 Engineering

## Responsibilities
R1: Existing manifest is canonical for all unit IDs, source references and lesson fingerprints.
R2: The curated overlay adds semantic links, depth-specific outcomes and proposed assessment blueprints without changing source imports.
R3: Astro composes immutable graph data and renders server-selected URL views.
S1: Overlay JSON immutable; URL query params own mode, selected concept and G0–G4 depth.
K1: src/domain/learning-graph.ts validates and indexes the overlay.
K2: src/components/curriculum/KnowledgeGraph.astro renders accessible concept neighborhoods.
K3: src/pages/index.astro selects mode; no new routes, databases or runtime dependencies.
K4: src/domain/learning-path.ts owns deterministic depth-aware prerequisite traversal, contextual URLs and validation of route membership.

## Flow and guarantees
/?mode=graph&level=G2 -> validate outcome mappings -> show only G2 units and same-level neighbors -> /?item=ID. Missing level renders an honest gap.
Unknown selection -> valid default focus; invalid overlay -> fail build rather than silently omit.
G1: Only explicitly reviewed requires edges may represent hard prerequisites.
G2: Workbook importer remains deterministic and untouched.
G3: All outcome unit IDs must be explicitly mapped to the same concept; never infer a missing level.
G4: 'requires' reviewed edges are traversed dependency-first and deduplicated; related edges never become prerequisite gates.
G5: URL route context is accepted only for a canonical mapped unit in the requested concept and depth.
G6: Every assessment criterion ID is unique per outcome and references an item in that outcome; no automatic grading or persistent evidence.
DEC1: JSON overlay + in-memory adjacency preferred to changing generated manifest or adding graph DB.
D1: Pilot proposed relationships require editorial review before promotion to reviewed.
DEC2: A read-only, depth-specific path derives from concept-level reviewed requires and the existing proposed itemIds editorial ordering. Missing prerequisite outcomes are surfaced as gaps.
DEC3: Rubrics live under curated outcomes; Graph shows the full proposed rubric, Project shows criteria only for the active path item.

## Verification
PF1 (P1,P2) [important] | selectors + unknown concept fallback | iter/pr | pnpm test
PF2 (P3,P4) [important] | validation, cycle and manifest integrity | iter/pr | pnpm test
PF3 (P1,P3,P5,P6) [important] | Astro golden and HTTP smoke | merge | pnpm ci
PF4 (P5,P6,G3) [important] | level mapping and gap unit tests | iter/pr | pnpm test
PF5 (P7,P8,G4,G5) [important] | prerequisite traversal and URL context | iter/merge | pnpm test; pnpm ci
PF6 (P9,P10,G6) [important] | assessment schema integrity, scoped Project and Golden/smoke | iter/merge | pnpm test; pnpm ci
