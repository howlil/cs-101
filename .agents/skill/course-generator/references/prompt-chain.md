# Prompt Chain

Use staged generation so each stage has a narrow responsibility and a testable output.

## Chain

```text
ITEM-ID
  ↓
[1] Graph Context Resolver
  ↓ generation/staging/<ITEM-ID>/context.json
[2] Source Researcher
  ↓ source-pack.json
[3] Lesson Architect
  ↓ lesson-spec.json
[4] Course Writer
  ↓ lesson.mdx
[5] Assessment Builder
  ↓ reviewQuestions inside lesson-spec.json
[6] Validator
  ↓ derived generation record + review bank + validation report
[7] Promote
  ↓ final lesson + metadata + review bank
```

Do not pass the full curriculum or raw browser/search dumps downstream. Pass compact structured artifacts.

## 1. Graph Context Resolver

Run:

```sh
pnpm generation:prepare SQL-001
```

The context packet is deterministic and bounded. It contains:

- target unit;
- scope, market expectation, criteria, challenge, duration;
- direct hard prerequisites with compact prior-scope signals;
- nearby module items;
- nearest contributing checkpoint;
- project lineage;
- bounded related/deep-dive/foundation/contributes-to context;
- curriculum source.

Failure conditions:

- item ID does not exist;
- target is checkpoint/integration instead of unit.

## 2. Source Researcher

Goal: support the exact curriculum scope without expanding it.

Write `source-pack.json`.

Questions:

- What is implementation-independent?
- What is technology/version-specific?
- What mechanism is necessary to debug or predict behavior?
- Which misconception would cause the learner to fail the challenge?

Use 1–5 sources. Inspect the curriculum-provided source first and prefer official/primary material. Keep unresolved facts in `unsupportedClaims`; validation fails while that list is non-empty.

## 3. Lesson Architect

Create `lesson-spec.json` before prose.

Build:

```text
payoff
  ↓
central predictive mental model
  ↓
core relationships/mechanisms
  ↓
worked trace / prediction
  ↓
guided practice
  ↓
challenge
  ↓
criterion evidence
```

The spec must include:

- learning outcomes;
- mental model;
- relationship graph;
- concepts + source URLs;
- misconception traps;
- practice;
- coverage matrix for every curriculum criterion plus challenge;
- exactly five review questions.

Every curriculum criterion must appear in at least one review-question `criterionIds`.

## 4. Course Writer

Write `lesson.mdx` using the canonical template.

Default order:

1. payoff;
2. learning outcomes;
3. mental model;
4. prerequisite links;
5. core concepts/mechanisms;
6. worked example/trace;
7. misconception traps;
8. guided practice;
9. quiz;
10. micro challenge;
11. project bridge when relevant;
12. exit criteria/evidence;
13. sources.

Direct prerequisites are linked, not re-taught in full.

## 5. Assessment Builder

Quiz and review must test reasoning used by the challenge, not trivia.

Use mixes of:

- prediction;
- explain-why;
- debugging;
- design choice;
- output/state-transition reasoning.

Review answer keys remain server-side at runtime. The generated review bank is derived from `lesson-spec.json`; do not maintain a second independent assessment definition.

## 6. Validator

Run:

```sh
pnpm generation:validate SQL-001
```

Validation checks:

- active curriculum fingerprint;
- zero unsupported claims;
- concept sources exist in source pack;
- full criterion/challenge coverage;
- review coverage;
- Astro frontmatter contract;
- required components;
- prerequisite references;
- source links.

It writes hashed derived artifacts. Targeted repairs should modify only the failing upstream stage.

## 7. Promote

Run:

```sh
pnpm generation:promote SQL-001
```

Promotion refuses a bundle changed since validation and writes the final lesson, generation record, and review bank. Generation never changes learner completion state.
