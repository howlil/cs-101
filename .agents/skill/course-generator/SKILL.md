---
name: course-generator
description: Generate one CS-101 unit on demand from Curriculum Manifest V2, research authoritative sources, and persist a validated Astro/MDX lesson plus review bank. Use for one unit such as SQL-001 or JAV-013. Project checkpoints and integrations use their dedicated runtime workspaces.
---

# Course Generator

Generate **one unit at a time**. Treat curriculum as source code and generated content as a compiled artifact.

## Execution model

```text
Item ID
  ↓
pnpm generation:prepare <ITEM-ID>
  ↓
context.json
  ↓
source research
  ↓
source-pack.json
  ↓
lesson-spec.json
  ↓
lesson.mdx
  ↓
pnpm generation:validate <ITEM-ID>
  ↓
derived generation record + review bank
  ↓
pnpm generation:promote <ITEM-ID>
```

Never write final lesson/review artifacts before the staged bundle passes validation.

## Input

Resolve to one Curriculum V2 Item ID.

- Unit, e.g. `SQL-001`: supported.
- Checkpoint, e.g. `SQL-P01`: do not generate as a lesson; use the project workspace.
- Integration, e.g. `INT-001`: do not generate as a lesson; use the integration workspace.

For ambiguous title lookup, resolve against Manifest V2 before generating.

## 1. Prepare graph context

Run:

```sh
pnpm generation:prepare SQL-001
```

Read `generation/staging/SQL-001/context.json`.

The resolver selects only deterministic relevant context:

- current item;
- direct prerequisites;
- nearby module items;
- nearest checkpoint;
- checkpoint lineage;
- bounded related/deep-dive/foundation/contributes-to relations;
- curated curriculum source.

Do not replace this packet with the full manifest.

## 2. Research sources

Read the curated curriculum source first, then primary/official sources for the exact scope.

Write `source-pack.json` using the schema in `src/domain/generation/schema.ts`.

Rules:

- 1–5 strong sources.
- Tier 0 = curriculum-provided source.
- Prefer Tier 1 official/primary sources.
- Every concept claim in the lesson spec must point to a URL in this pack.
- Keep `unsupportedClaims` non-empty until unresolved factual gaps are actually resolved.
- Do not broaden curriculum scope to justify extra research.

## 3. Build lesson spec

Create `lesson-spec.json` before prose.

It must contain:

- payoff;
- concrete learning outcomes;
- one predictive mental model;
- relationship/cause-effect graph;
- concepts in dependency order;
- mechanism explanation per concept;
- misconception traps;
- guided practice;
- full criterion/challenge coverage matrix;
- exactly five review questions.

Each curriculum criterion must be tested by at least one review question. Challenge coverage is required in the lesson/evidence matrix but does not need to become trivia in the review bank.

## 4. Write lesson

Write `generation/staging/<ITEM-ID>/lesson.mdx` using `assets/lesson-template.mdx`.

Preserve:

- original scope;
- original challenge intent;
- original Definition of Done;
- direct prerequisite identity.

Optimize teaching order, not requirements.

Required course components:

- MentalModel
- ConceptGraph
- Quiz
- Challenge
- ExitCriteria
- SourceList

## 5. Validate

Run:

```sh
pnpm generation:validate SQL-001
```

Validation blocks:

- stale fingerprint;
- missing criterion/challenge coverage;
- review questions not covering curriculum criteria;
- unsupported claims;
- source URLs outside source pack;
- invalid frontmatter;
- missing prerequisite references;
- source pack URLs absent from lesson;
- missing required course components.

The validator derives:

- `generation-record.json`
- `review-bank.json`
- `validation-report.json`

Do not hand-edit derived files.

## 6. Promote

Run:

```sh
pnpm generation:promote SQL-001
```

Promotion verifies validation hashes and writes:

- `src/content/lessons/<ITEM-ID>.mdx`
- `generation/<ITEM-ID>.json`
- `review-banks/<ITEM-ID>.json`

Then run:

```sh
pnpm validate:content
pnpm validate:reviews
```

Generating content never marks the learner item passed.

## Writing rules

- Payoff first.
- One strong mental model.
- Explain dependency, mechanism, invariant, state transition, and failure mode when they affect reasoning.
- Prefer prediction before execution.
- Code/examples must be minimal and tied to a criterion.
- Pareto applies to teaching order, never to deleting requirements.
- No invented metrics, APIs, behavior, citations, or requirements.

## Non-goals

Do not bulk-generate by default. Do not use checkpoint/integration as ordinary MDX lessons. Do not turn contextual relations into prerequisites. Do not use blogs as primary evidence when official sources exist. Do not provide full project solutions when implementation practice is the learning goal.

## Completion report

Report:

- Item ID + generated lesson path;
- authoritative sources used;
- criterion/challenge coverage status;
- review bank status;
- unresolved source/curriculum conflicts;
- next learner action.
