# CS-101 Product

## Problem
Actor: engineering learner. Acceptor: learner.
J1: When studying one concept, I want to follow its cross-domain applications so I can choose useful learning material without finishing isolated tracks.

## Behavior
B1: A Library user selects Knowledge Graph on the same page.
B2: A user focuses a concept and follows its curated neighbors using shareable URLs.
B3: A user opens the mapped canonical curriculum item, and returns to its graph concept.
B4: A user selects G0–G4 depth and sees level-specific competency evidence and source units.
B5: A user follows a deterministic suggested study path, with reviewed prerequisites first where they exist and editorial unit order otherwise.
B6: From a path unit, navigation preserves its context across Materi, Soal and Project; after Project the next unit is addressable.
B7: A user can inspect a proposed task and observable assessment rubric for each mapped competency, then find only the applicable criterion in that unit's Project view.
B8: A user can open NET-001 as a real source-backed V3 lesson, take five local quiz questions and inspect a cross-layer failure challenge.
B9: A user proceeds from NET-001 to a fully authored SPR-006 controller contract lesson: routing, 201/Location, GET 200/404, validation and service delegation.
B10: A user opens an authored OSX-029 G1/G2 lesson with five self-check questions, socket binding proof and an independent privileged veth namespace lab.
B11: A learner opens PRD-002 with source-backed startup/liveness/readiness distinctions, five local quiz questions, a health-state fixture, and a Spring/Kubernetes readiness challenge.
B12: Each proposed competency criterion identifies the actual kind of evidence required in the Knowledge Graph and contextual Project view, without mistaking local fixtures for integration proof.
B13: A learner sees a genuine curated node-edge neighborhood on the Graph page, pans/zooms the viewport, selects a linked concept and keeps the same URL/depth semantics and nonvisual navigation.
B14: A mapped unit displays its level-specific one-hop graph in the Materi view and links back to the full Graph; unmapped units show a global Graph entry without fabricated local edges.
B15: A learner opens JAV-001 Build Doctor as a source-backed V3 lesson with real Java 21 toolchain, compile/runtime diagnosis, Maven scope reasoning, five questions and an independent reproducible CLI/JAR challenge.
B16: A learner navigates curated G1 cross-domain concept neighborhoods linking Java/Spring, PostgreSQL schema, API contract tests, and system-level transfer API design to existing HTTP concepts and canonical units.
B17: A learner opens NET-006 as a source-backed V3 TCP handshake/sequence/retransmission/close lesson, completes five questions and follows an independent packet capture challenge.
B18: A learner opens SQL-001 as a complete source-backed V3 SQL Workbench, runs a repeatable init.sql on isolated PostgreSQL and compares six real database query results, with the evidence scope clearly marked.
B19: A learner opens TST-007 as a complete V3 Money Unit Tests lesson with 20 runnable JUnit Jupiter cases for the explicitly educational FeeCalculator policy, then proves results via Maven without Spring context.
B23: A learner opens TST-021 as a source-backed V3 Pact lesson with five questions; CI runs real consumer mock generation and Pact provider verification against healthy and deliberately retyped local HTTP responses.
B22: A learner opens authored TST-020 and diagnoses required-field/type response drift and conditional optional-field compatibility, with V3 source-backed material, five quiz questions and a reproducible Node fixture.
B21: A learner opens authored TST-019 with 10 real HTTP loopback checks against SYS-008, five questions, three malformed-response rejects, and an explicit 422 contract gap.
B20: A learner opens SYS-008 as a source-backed transfer API design lesson with three machine-readable paths, explicit 201/400/401/403/409/500 rationale, GET 404, RFC 9457 problem format and optional-field backward compatibility design review.
X1: Unknown concept IDs recover to the first valid focus.
X2: Unauthored items are labeled outline-only.
X3: Unmapped levels or concept-depth pairs show explicit gaps.
X4: Missing-depth prerequisites are reported, never silently treated as complete; invalid path context is ignored.
X5: Unmapped project routes and missing levels must never show an assessment for another concept or depth.
X6: A concept-depth without an outcome has an explicit gap instead of a fabricated graph; links remain keyboard accessible when pointer drag is unavailable.
C1: Stateless, read-only; no accounts, progress, study sessions or database.
C2: Preserve 370 workbook units and deterministic import.
C3: Proposed relations must never gate study as prerequisites.
C4: Competency proposals do not imply mastery, job seniority, or published authored lessons.
C5: Related/deepens edges do not impose prerequisites. Workbook and suggested outcome order alone do not establish hard prerequisites.
C6: Rubrics are editorial proposals for human review, not generated quiz banks, automatically scored evidence, learner certifications or stored submissions.
C7: Published lessons require generation provenance, source claim ledger and deterministic V3 receipt; a supported Node/Java executable fixture is required unless a scoped nonExecutableReason is explicit and a separate real integration test verifies the unsupported runtime (SQL-001). No fabricated packet captures or unstated protocol assumptions.
C8: SPR-006's JDK HTTP fixture proves protocol status/header behavior, not Spring runtime annotation wiring; a Spring MockMvc challenge is explicitly separate.
C9: OSX-029's CI fixture proves local Linux IPv4 socket bind behavior, not cross-namespace networking, firewall or external exposure; those are a manual challenge.
C10: PRD-002 fixture proves HTTP status under simulated state transitions, not real database, Actuator, Kubernetes Service routing, or container restart behavior.
C11: Assessment evidence kinds are mandatory and explicitly distinguish design review, framework testing, peer-network labs, packet traces and cluster experiments. All concept relations remain proposed, without inferred prerequisites.
C12: JAV-001 JDK fixture tests compiler and runtime class-loading only; it cannot be presented as proof of Maven clean verify, dependency scope correction or executable JAR success.
C13: New G1 cross-domain links and assessment rubrics remain proposed; outline units must not be shown as published lessons or as proven competencies. Java CLI and PostgreSQL criteria require real target environments.
C14: NET-006 local Node fixture checks socket-level connect/EOF/refusal only; no fake packet capture, SYN/ACK flags, retransmission or timeout proof is allowed.
C15: SQL-001 must not imply PostgreSQL proof from an empty executable plan; independent PostgreSQL 16 CI creates fresh and replayed sandbox data and checks actual query/constraint behavior, without a production DB binding.
C16: TST-007 V3 generator cannot prove Maven/JUnit behavior via the single-file runner; its not-executable status is paired with a real Maven JUnit/Surefire gate verifying 20 tests with zero failures and no Spring context. Fee parameters are lab policy, not real financial tariffs.
C20: TST-021's V3 receipt explicitly records no Pact executable in the bounded generator, while dedicated CI installs pinned Pact JS 17.1.4 and verifies a local Node provider. Do not claim Spring, external bank, JWT, database, settlement or deployed provider behavior. TST-021 remains unmapped in the curated G1 graph rather than implying a prerequisite.
C19: TST-020 static fixture checks a selected OpenAPI response/schema subset and illustrative consumers; no production provider, deployed client, Spring or Pact conformance is claimed.
C18: TST-019's Node network fixture tests only an educational in-memory server, never live Spring MVC, JWT, database, payment idempotency or financial settlement; 422 remains undeclared in SYS-008.
C17: SYS-008's Node fixture validates a selected OpenAPI design subset only; it never claims live HTTP, Spring MVC, authentication, idempotent transfer, settlement or universal consumer compatibility.

## Scope
In: HTTP pilot, depth-specific paths/rubrics, and twelve authored V3 units (NET-001, NET-006, SPR-006, OSX-029, PRD-002, JAV-001, SQL-001, TST-007, SYS-008, TST-019, TST-020, TST-021); SQL-001 and TST-007 use separate PostgreSQL/Maven integration proof.
Out: learner tracking, adaptive mastery, inferred graph edges, bulk lesson generation.

## Proof
P1 (B1-B3): Deep links select focus and canonical material.
P2 (X1): Invalid concept ID displays valid focus.
P3 (X2,C2): Original units remain unchanged; content availability is truthful.
P4 (C3): Broken mappings, duplicates, unreviewed prerequisites and cycles are rejected.
P5 (B4): G1/G2 display distinct competency and unit recommendations.
P6 (X3): Uncurated depths show explicit navigable gaps.
P7 (B5,C5): Deterministic prerequisite traversal is dependency-first, stable, and deduplicates shared units without inferring new prerequisites.
P8 (B6,X4): Route item context survives views, allows a next-unit handoff, and fails closed for invalid/unrelated URLs.
P9 (B7,C6): Every mapped competency has an assessable task and criteria tied to canonical outcome units.
P10 (X5,C6): Project-only rubric is scoped to validated concept/level/unit context and never exposes a quiz, score, or learner state.
P11 (B8,C7): NET-001 runs source→spec→fixture→promote byte-identically in CI, and Materi/Soal/Project render separately.
P12 (B9,C8): SPR-006 reproducible generation, JDK status/header fixture, and three separate focused views with G1 path context in CI.
P13 (B10,C9): OSX-029 generation and local fixture are byte-reproducible; G1/G2 focused views render accurately without claiming automatic netns proof.
P14 (B11,C10): PRD-002 generated V3 artifacts and local HTTP status fixture reproduce exactly; Materi/Soal/Project are tested for G2 HTTP and G1/G2 readiness contexts.
P15 (B12,C11): Every curated rubric criterion declares a validated evidence kind; unit and Golden tests reject missing/invalid kinds, with visible labels on Graph and Project, no promoted prerequisite edges.
P16 (B13,X6,C3): Deterministic scene matches only reviewed-overlay relations for the active level, renders linked SVG nodes, and retains link-list fallback, with no canvas on an uncurated level.
P17 (B14,X2,X5): Mapped Materi shows a matching Graph neighborhood and deep link; other units state the unmapped gap, and no graph canvas appears in Soal/Project views.
P18 (B15,C12): JAV-001 generation and JDK 21 compile/runtime fixture reproduce byte-identically; the first Java unit renders distinct Materi/Soal/Project pages while its graph mapping remains explicitly absent at that slice.
P19 (B16,C13): Four G1 cross-domain concepts add only explicit source-mapped canonical units, validated rubric evidence and proposed related edges; G2 remains an honest gap on newly added concepts.
P20 (B17,C14): NET-006 V3 bundle promotes byte-identically with a real Node 24 stream fixture, five questions and separate Materi/Soal/Project URL smoke; packet capture remains manual.
P21 (B18,C15): SQL-001 publishes repeatable V3 artifacts and three views; Docker-isolated PostgreSQL 16 executes init.sql, six SELECT queries, replay, fresh second DB and FK negative case in merge CI.
P22 (B19,C16): TST-007 V3 authoring reproduces byte-identically; JDK 21 Maven Surefire discovers exactly 20 Jupiter tests with zero errors/failures/skips; Materi/Soal/Project smoke is green without Spring context.
P26 (B23,C20): TST-021 V3 content has byte-identical source receipts, real Pact mock consumer interactions, healthy local HTTP provider verification, negative amount-type rejection and Materi/Soal/Project smoke. Its generated proof remains explicitly not-executable.
P25 (B22,C19): TST-020 V3 content and static fixture regenerate byte-identically; breaking response mutations fail, additive tolerant consumer passes, strict consumer rejects, and three focused views smoke.
P24 (B21,C18): TST-019 V3 artifacts reproduce and local HTTP fixture completes ten real requests, rejects three intentional mutations, documents undeclared 422 and renders Materi/Soal/Project separately.
P23 (B20,C17): SYS-008 V3 bundle and OpenAPI static contract fixture reproduce; mapped G1 Materi/Soal/Project render, errors/status match, and old-client optional-field acceptance plus breaking type rejection are exercised.
