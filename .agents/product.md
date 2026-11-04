# CS-101 Product

## Problem
Actor: engineering learner. Acceptor: learner.
J1: When studying one concept, I want to follow its cross-domain applications so I can choose useful learning material without finishing isolated tracks.

## Behavior
B1: A Library user selects Knowledge Graph on the same page.
B2: A user focuses a concept and follows its curated neighbors using shareable URLs.
B3: A user opens the mapped canonical curriculum item, and returns to its graph concept.
B4: A user selects G0–G4 depth and sees level-specific competency evidence and source units.
X1: Unknown concept IDs recover to the first valid focus.
X2: Unauthored items are labeled outline-only.
X3: Unmapped levels or concept-depth pairs show explicit gaps.
C1: Stateless, read-only; no accounts, progress, study sessions or database.
C2: Preserve 370 workbook units and deterministic import.
C3: Proposed relations must never gate study as prerequisites.
C4: Competency proposals do not imply mastery, job seniority, or published authored lessons.

## Scope
In: HTTP lifecycle pilot, validated level outcomes, G0–G4 filters and level-specific mapped unit recommendations.
Out: learner tracking, adaptive mastery, inferred graph edges, bulk lesson generation.

## Proof
P1 (B1-B3): Deep links select focus and canonical material.
P2 (X1): Invalid concept ID displays valid focus.
P3 (X2,C2): Original units remain unchanged; content availability is truthful.
P4 (C3): Broken mappings, duplicates, unreviewed prerequisites and cycles are rejected.
P5 (B4): G1/G2 display distinct competency and unit recommendations.
P6 (X3): Uncurated depths show explicit navigable gaps.
