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
  → researched source-pack.json
  → lesson-spec.json (model, explanation, examples, practice, questions, challenge coverage)
  → lesson.mdx using assets/lesson-template.mdx
  → pnpm generation:validate <ID>
  → derived metadata and question bank
  → pnpm generation:promote <ID>
  → pnpm ci
```

Do not publish a generated file before validation.

### Context

Read `generation/staging/<ID>/context.json` from `generation:prepare`. This bounded packet includes prerequisite concepts, neighboring units, nearest checkpoint/project lineage, relation signals, criteria, and curriculum source. Never load the entire manifest for one lesson.

### Research

Inspect the curated source first, then 1–5 authoritative sources specific to the declared scope. Prefer primary documentation and standards. Record direct URLs in `source-pack.json`. Unsupported claims must be resolved or omitted before validating.

### Pedagogical scaffolding (mandatory for newly generated units)

The current manifest item ID remains stable. Split broad scopes into short *learning segments inside the same unit*, not new curriculum item IDs. Avoid fixed 5-minute caps or compulsory completion, reflection, uploads, learner tracking, or timers. Each segment must have exactly one actionable objective and provide:

1. A concrete reason/context from the project's engineering problem.
2. A mental model and mechanism in plain language, followed by correct technical detail.
3. A worked example: each step includes an action, why it works, and observable result.
4. A guided practice prompt with 2–3 hints disclosed on demand, plus a separate explanation.
5. An independent transfer challenge mapped to original acceptance criteria.

Write optional \`pedagogy\` metadata in the new lesson-spec using \`pedagogySpecSchema\` (version 2). New authored units **must** include it; older staged specs without it remain readable for backwards compatibility while being migrated. Each original criterion and the challenge must be covered by at least one segment's independent challenge. Where a direct \`contributes_to\` edge exists, add a \`projectBridge\` with a real checkpoint and actual requirement IDs; do not invent a bridge from the nearest module checkpoint.

Keep the presentation reading-first. Reuse \`WorkedExample\`, \`GuidedPractice\`, and \`ProjectContribution\` when they improve the content; do not add separate routes, required interactions, completion gates or persisted state. Favor predictive reasoning, debugging and runnable examples over multiple-choice trivia. A knowledge check is formative, not a clinical ADHD test.

### Lesson specification

Create `lesson-spec.json` before prose, including:
- immediate learning payoff, predictive mental model, and dependency/causal graph;
- mechanisms, invariants, worked examples, and misconceptions;
- guided implementation and independent practice;
- every curriculum criterion plus the original challenge in the coverage matrix;
- exactly five question-bank prompts aligned to criteria, with explanations.

`evidenceExpected` in metadata means **a locally observable result**, not a submission or persisted learner record.

### Write MDX

Use `assets/lesson-template.mdx` with three **visible in-page sections**:
1. Materi — mental model, explanations, traces, and sources.
2. Latihan soal — formative quiz, guided practice and challenge.
3. Praktik — self-verification checklist only; no evidence form, progress state, or upload.

A separate **Ide project** section is composed by the content page using the nearest relevant checkpoint from the manifest.

Required components: `LessonStage`, `MentalModel`, `ConceptGraph`, `Quiz`, `Challenge`, `ExitCriteria`, `SourceList`. Use reusable content components; never add page navigation, global sidebar, or trackers into lesson MDX.

### Validate and publish

```sh
pnpm generation:validate SQL-001
pnpm generation:promote SQL-001
pnpm ci
```

Validation blocks stale fingerprints, unsupported claims, missing source coverage, missing criterion/challenge assessment coverage, malformed MDX/frontmatter, broken prerequisite identities, and invalid question banks. Promotion checks artifact hashes.

Outputs retain compatibility paths:
- `src/content/lessons/<ID>.mdx` — material, quiz, manual challenge;
- `generation/<ID>.json` — provenance, source mapping, coverage;
- `review-banks/<ID>.json` — **reusable practice-question content only**; this legacy directory name does not imply a review scheduler.

Do not bulk-generate automatically, broaden scope to fill space, write full project solutions, fabricate citations, or add learner-state code.

## Completion report

Report published item ID, source URLs, content sections, criterion coverage, question quality/coverage, project bridge, validation results, and remaining content gaps.
