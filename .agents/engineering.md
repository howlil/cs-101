# CS-101 Engineering

## Responsibilities
R1: Existing manifest is canonical for all unit IDs, source references and lesson fingerprints.
R2: The curated overlay adds semantic links, depth-specific outcomes and proposed assessment blueprints without changing source imports.
R3: Astro composes immutable graph data and renders server-selected URL views.
S1: Overlay JSON immutable; URL query params own mode, selected concept and G0–G4 depth.
K1: src/domain/learning-graph.ts validates and indexes the overlay.
K2: src/components/curriculum/KnowledgeGraph.astro renders accessible concept neighborhoods with a React SVG canvas; graph-canvas-layout.ts derives positions from validated one-hop edges without persistence.
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
G7: Authored content must retain exact V3 receipts and runnable proof; source provenance is checked against primary RFC, Spring and Linux manuals.
G8: Local 127.0.0.2 probing in OSX-029 never claims cross-netns proof; only the explicit manual veth lab addresses peer isolation.
G9: PRD-002 never drives liveness from shared DB failure and never treats HTTP fixture outcomes as Kubernetes orchestration evidence.
G10: Each proposed assessment criterion declares a typed evidence kind, enforced at overlay validation, exposed in both rubric surfaces and never implied by fixture execution alone.
G11: JAV-001 distinguishes JDK fixture's compile/loading evidence from actual Maven build/manifest verification, which remains a learner challenge.
G12: New Java and PostgreSQL rubric evidence must cite actual CLI/DB runs, while new cross-domain mappings cannot alter existing HTTP routes, prerequisite graph semantics or canonical unit publication status.
G13: NET-006 code-level connect/EOF/refusal evidence must not be promoted into packet-level TCP handshake or retransmission claims without actual capture.
G14: SQL-001 V3 receipt asserts authorship and explicitly not-executable SQL runtime, while a separate Docker-isolated PostgreSQL 16 integration step proves schema/data and repeatability. No application database binding is introduced.
G15: TST-007 distinguishes generator's no-executable Maven/JUnit status from actual Surefire execution; the dedicated pure Java lab tests observable fee results, fixed decimal policy and errors without Spring context.
G17: TST-019 uses real ephemeral loopback HTTP against an in-memory educational stub to verify SYS-008 responses, including 3 mutation guards; 422 is absent and Spring/auth/settlement remain unproven.
G16: SYS-008 static OpenAPI spec examples and Node fixture require real status/error/DTO consistency, without conflating static review with a deployed Spring service, auth provider or payment guarantees.
DEC1: JSON overlay + in-memory adjacency preferred to changing generated manifest or adding graph DB.
D1: Pilot proposed relationships require editorial review before promotion to reviewed.
DEC2: A read-only, depth-specific path derives from concept-level reviewed requires and the existing proposed itemIds editorial ordering. Missing prerequisite outcomes are surfaced as gaps.
DEC3: Rubrics live under curated outcomes; Graph shows the full proposed rubric, Project shows criteria only for the active path item.
DEC4: NET-001 is the first authored cross-domain pilot; staged source/spec for NET-001 and SPR-006 are tracked for byte-identical CI reproduction, while Golden acceptance remains isolated.
DEC5: The SPR-006 reference fixture executes JDK 21 local HTTP contract tests, not Spring application wiring; framework integration remains an explicit MockMvc learner challenge.
DEC6: OSX-029 uses unprivileged local Node socket probes; root-required network namespace setup is a separate disposable-VM learner lab.
DEC7: PRD-002 uses documented Actuator /live and /ready aliases; state-driven Node HTTP verification is separate from Spring/Kubernetes fault injection.
DEC8: Editorial evidence precision is part of the proposed rubric schema; no speculative reviewed graph edge, runtime progress state or database is introduced.
DEC9: Graph viewport owns local pan/zoom only; concept and depth remain URL-owned and native links are retained outside the canvas.
DEC10: Lesson graph previews derive from validated concept application mappings, preferring explicit path context over the first curated G1 outcome; no inferred links for unmapped units.
DEC11: JAV-001 uses a self-contained JDK 21 compiler/runtime fixture with no Maven downloads or new build dependencies; actual Maven JAR verification is a distinct project exercise.
DEC12: Cross-domain expansion is a small editorial overlay addition with two typed evidence categories, not imported workbook edits or an auto-generated graph.
DEC13: NET-006 uses ephemeral loopback Node sockets with local stream-level proof only; privileged network capture belongs to a disposable VM learner lab.
DEC14: PostgreSQL SQL runner remains outside the eight-second Node/Java V3 authoring fixture: a disposable Docker container with no external network runs lab SQL and six inspections in CI; authoring plan keeps an explicit not-executable reason.
DEC15: Use a separate Maven project with JUnit Jupiter 5.14.4 and Surefire 3.5.4 to prove TST-007 instead of adding plugin execution to the bounded authoring runner or starting Spring; assert test count from Surefire XML.
DEC16: Publish SYS-008 as a standalone OpenAPI 3.1.1 JSON design proposal and use bounded Node contract/example checks in V3 authoring; preserve separate actual Spring MVC/auth/runtime implementation proof.

## Verification
PF1 (P1,P2) [important] | selectors + unknown concept fallback | iter/pr | pnpm test
PF2 (P3,P4) [important] | validation, cycle and manifest integrity | iter/pr | pnpm test
PF3 (P1,P3,P5,P6) [important] | Astro golden and HTTP smoke | merge | pnpm ci
PF4 (P5,P6,G3) [important] | level mapping and gap unit tests | iter/pr | pnpm test
PF5 (P7,P8,G4,G5) [important] | prerequisite traversal and URL context | iter/merge | pnpm test; pnpm ci
PF6 (P9,P10,G6) [important] | assessment schema integrity, scoped Project and Golden/smoke | iter/merge | pnpm test; pnpm ci
PF7 (P11,G7) [important] | NET-001 authoring receipt, proof and isolated Golden | merge | pnpm ci
PF8 (P12,G7) [important] | SPR-006 reproducible artifacts, Java HTTP proof and focused route smoke | merge | pnpm ci
PF9 (P13,G8) [important] | OSX-029 reproducible authored content, local Linux socket proof and G1/G2 route smoke | merge | pnpm ci
PF10 (P14,G9) [important] | PRD-002 verified receipt, local status-state proof and contextual G1/G2 smoke | merge | pnpm ci
PF11 (P15,G10) [important] | evidence-kind schema failures, 15 rubric classifications, Golden and Project/Graph smoke | merge | pnpm ci
PF12 (P16,G1) [important] | deterministic scene and real one-hop edges, SSR links and no fabricated graph on missing depth | iter/merge | pnpm test; pnpm ci
PF13 (P17,G5) [important] | mapped/unmapped lesson fallback, level context, and Materi-only map | merge | pnpm ci
PF14 (P18,G11) [important] | JAV-001 V3 artifacts, real JDK 21 compile/runtime proof and view-specific smoke | merge | pnpm ci
PF15 (P19,G12) [important] | G1 path/rubric validation, graph canvas neighborhood and HTTP route smoke for authored/outline cases | merge | pnpm ci
PF16 (P20,G13) [important] | NET-006 V3 receipt, Node loopback fixture and Materi/Soal/Project route smoke | merge | pnpm ci
PF17 (P21,G14) [important] | SQL-001 reproducible bundle, isolated real PostgreSQL run, six-query expected data and focused route smoke | merge | pnpm ci
PF18 (P22,G15) [important] | TST-007 authoring V3 receipt, real Maven Surefire 20-case report and Materi/Soal/Project smoke | merge | pnpm ci
PF20 (P24,G17) [important] | ten live HTTP requests, three mutation rejects, explicit 422 contract gap | merge | CI TST-019 fixture
PF19 (P23,G16) [important] | SYS-008 V3 byte-reproducible static checker, RFC status/error shape, G1 contextual routes and three-view smoke | merge | pnpm ci
