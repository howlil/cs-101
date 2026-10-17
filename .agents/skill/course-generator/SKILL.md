---
name: course-generator
description: Generate one CS-101 unit as an authored learning material with explanatory MDX, local practice quiz, and project bridge. Uses authoritative sources and coverage validation. The website is a read-only content library, not a learning-progress system.
---

# CS-101 Content Generator

Generate **one unit at a time**. Curriculum Manifest V2 is the specification. MDX, question banks, and provenance are versioned compiled content.

## Product contract

CS-101 has **one content page**, `/`, whose sidebar selects domains and items. It displays authored materials, practice questions, and project ideas. There are no learner states, session logs, review due dates, databases, answer submissions to a server, or completion gates.

- Unit (`JAV-003`) → generate MDX lesson plus five-question bank.
- Checkpoint (`JAV-P01`) → source-backed project idea from manifest; **not** an MDX lesson.
- Integration (`INT-001`) → source-backed cross-domain exercise from manifest.

## Workflow

```text
Item ID
  → pnpm generation:prepare <ID>
  → bounded graph context
  → researched source-pack.json + claim-to-source ledger
  → lesson-spec.json (model, explanations, criterion mapping, reviewed V3 pedagogy, questions)
  → executable-examples.json + reviewed single-file fixtures (.mjs or .java)
  → lesson.mdx using assets/lesson-template.mdx
  → pnpm generation:validate <ID>
  → derived pedagogy, question bank, verified source pack, runnable proof and receipt
  → pnpm generation:promote <ID>
  → pnpm ci
```

Do not publish a generated file before validation.

### Context

Read `generation/staging/<ID>/context.json` from `generation:prepare`. This bounded packet includes prerequisite concepts, neighboring units, nearest checkpoint/project lineage, relation signals, criteria, and curriculum source. Never load the entire manifest for one lesson.

### Research

Inspect the curated source first, then 1–5 authoritative sources specific to the declared scope. Prefer primary documentation and standards. Record direct URLs in `source-pack.json`. For V3, give each authored concept at least one factual claim with a source URL, stable concept ID, direct source-page locator and a reason this source supports the claim. Source URLs must exist in the pack. Inspect the actual referenced page yourself: the validator **checks coverage and references, not factual truth or live website content**. Unsupported claims must be resolved or omitted before validating.

### Pedagogical scaffolding V3 (mandatory for new lessons)

Keep stable curriculum unit IDs and preserve all acceptance criteria. Split broad scopes into one-objective learning segments inside each unit. Do not create mandatory sessions, timers, reflection forms, streaks, or a learner database.

Every V3 segment must contain:

1. **Why:** one real-world engineering problem and why the objective matters.
2. **Start:** one small, concrete `firstAction` achievable without planning ceremony.
3. **Understand:** an accurate mental model, mechanism, and worked example with action, reason, and observable result.
4. **Try:** guided practice with 2-3 progressively specific optional hints and a separate explanation.
5. **Recover:** `misconceptionRepair` specifying the likely error, causal explanation, and corrective action.
6. **Self-check:** an expected observation and what to inspect if the result differs.
7. **Prove:** an independent transfer challenge on a *different* case, mapped to canonical criterion IDs.
8. **Continue:** a next action and a `resumeCue` to restart after interruption without saving progress.

New authored lesson specs **must** set `pedagogy.version: 3` and satisfy `pedagogySpecV3Schema`. V2 remains readable for earlier published lessons only. Every original criterion and challenge must be covered. A `projectBridge` may only reference a real checkpoint and requirements connected by an explicit `contributes_to` relation.

**Authoring quality gate:** verify that the first step is genuinely approachable, the explanation is correct, hints gradually reveal information, the transfer problem differs meaningfully, and the recovery hint helps rather than scolds. Structural validation is not proof of learning effectiveness. Do not conflate ADHD with low ability or a prescribed learning style.

Render one coherent **Why → Understand → Try → Prove → Connect** cycle per meaningful objective. M2's shared renderer displays all provided V3 segments in three stages, but **does not prove that manually embedded lessonSegments equal lesson-spec.json**; M3 will add artifact-level parity and executable proof. Keep this limitation visible in review.
### Lesson specification

Create `lesson-spec.json` before prose, including:
- immediate payoff, first action, predictive mental model, and causal graph;
- mechanisms, invariants, worked examples, and misconceptions;
- guided practice, explicit mistake repair, self-check, independent transfer, and resume cue;
- every curriculum criterion plus the original challenge in the coverage matrix;
- exactly five question-bank prompts aligned to criteria, with explanations.

`evidenceExpected` in metadata means **a locally observable result**, not a submission or persisted learner record.

### Write MDX

Use `assets/lesson-template.mdx` with three **visible in-page sections**. In V3, write one `lessonSegments` array from the reviewed `lesson-spec.pedagogy.segments` and render it through `<LearningSegments stage="understand|practice|evidence" segments={lessonSegments} />` for the corresponding stage. Do not hand-build separate copies of the same data in the MDX. Each stage uses the same segment IDs; the reusable renderer provides the Why/Start/Understand, Try/Recover/Self-check, and Prove/Continue blocks respectively:
1. Materi — mental model, explanations, traces, and sources.
2. Latihan soal — formative quiz, guided practice and challenge.
3. Praktik — self-verification checklist only; no evidence form, progress state, or upload.

A separate **Ide project** section is composed by the content page using the nearest relevant checkpoint from the manifest. In formative quiz questions, supply optional `whenIncorrect` (one actionable correction) and `nextAction` (one next experiment) when appropriate. These do not track answers; no completion or session UI.

Required components: `LessonStage`, `MentalModel`, `ConceptGraph`, `LearningSegments`, `Quiz`, `Challenge`, `ExitCriteria`, `SourceList`. The old `WorkedExample` and `GuidedPractice` components remain available to older V2 lessons; V3 consumes them through `LearningSegments`. Use reusable content components; never add page navigation, global sidebar, or trackers into lesson MDX.

### M3 verification artifacts (required for new V3 lessons)

- Create `generation/staging/<ID>/executable-examples.json` from the prepared template. Supported runners are **Node .mjs** and **Java .java** (source-file launcher, JDK 21). Place reviewed fixtures inside `generation/staging/<ID>/fixtures/`. Each fixture defines exact expected stdout. Use only local code you have reviewed; the runner executes these files in CI without a shell. If the topic truly has no executable artifact, use `examples: []` and a meaningful `noExecutableReason`; this is explicitly marked **not executable**, not passed as verified.
- `generation:validate` executes fixtures, checks source claim mapping, validates the shared MDX imports and writes pedagogy/source/quiz/proof artifacts and a digest receipt.
- `generation:promote` checks every digest and re-executes fixtures before publishing `generation/pedagogy/<ID>.json`, `generation/sources/<ID>.json`, `generation/proofs/<ID>.json`, `generation/executables/<ID>.json`, `generation/fixtures/<ID>/`, `generation/verified/<ID>.json` plus lesson, record and bank.
- The authored MDX must import `../../../generation/pedagogy/<ID>.json` and `../../../review-banks/<ID>.json`, define `lessonSegments = pedagogyRecord.pedagogy.segments`, use `<Quiz bank={questionBank} />`, and consume the shared segments for all three stages. Do not author inline quiz arrays or duplicate segment JSON.
- `pnpm validate` rechecks receipt hashes and reruns all published fixtures on each build. A mismatch fails the build. This is a reproducibility check, **not** general-purpose code isolation, network fact-checking, or proof that learners understand the content. PostgreSQL / SQL execution support and real-world usability evaluation remain follow-up work.

### Validate and publish

```sh
pnpm generation:validate SQL-001
pnpm generation:promote SQL-001
pnpm ci
```

Validation blocks stale fingerprints, unresolved claim declarations, invalid V3 shape, missing criterion/source mapping, malformed frontmatter, broken prerequisite references, and invalid question banks. Promotion checks artifact hashes. Source credibility and teaching quality still require human/technical review; executable fixtures now have reproducible local proof for supported runtimes. Claims without fixtures remain editorial review only.

Outputs retain compatibility paths:
- `src/content/lessons/<ID>.mdx` — material, quiz, manual challenge;
- `generation/<ID>.json` — provenance, source mapping, coverage;
- `review-banks/<ID>.json` — **reusable practice-question content only**; this legacy directory name does not imply a review scheduler.

Do not bulk-generate automatically, broaden scope to fill space, write full project solutions, fabricate citations, or add learner-state code.

## Completion report

Report published item ID, source URLs, content sections, criterion coverage, question quality/coverage, project bridge, validation results, and remaining content gaps.
