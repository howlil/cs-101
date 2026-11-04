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
X1: Unknown concept IDs recover to the first valid focus.
X2: Unauthored items are labeled outline-only.
X3: Unmapped levels or concept-depth pairs show explicit gaps.
X4: Missing-depth prerequisites are reported, never silently treated as complete; invalid path context is ignored.
X5: Unmapped project routes and missing levels must never show an assessment for another concept or depth.
C1: Stateless, read-only; no accounts, progress, study sessions or database.
C2: Preserve 370 workbook units and deterministic import.
C3: Proposed relations must never gate study as prerequisites.
C4: Competency proposals do not imply mastery, job seniority, or published authored lessons.
C5: Related/deepens edges do not impose prerequisites. Workbook and suggested outcome order alone do not establish hard prerequisites.
C6: Rubrics are editorial proposals for human review, not generated quiz banks, automatically scored evidence, learner certifications or stored submissions.

## Scope
In: HTTP pilot, level outcomes, read-only study routes and source-unit-scoped proposed rubric criteria in graph and Project views.
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
