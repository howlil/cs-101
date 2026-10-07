# Generation pipeline

Generated lessons are compiled artifacts. Curriculum Manifest V2 remains the specification.

Only `kind: "unit"` produces lesson MDX. Checkpoint and integration use their runtime workspaces.

## One-item workflow

```text
ITEM-ID
  ↓
generation:prepare
  ↓
generation/staging/<ITEM-ID>/context.json
  ↓
research authoritative sources
  ↓
source-pack.json
  ↓
lesson-spec.json
  ↓
lesson.mdx
  ↓
generation:validate
  ↓
derived/
  ├─ generation-record.json
  ├─ review-bank.json
  └─ validation-report.json
  ↓
generation:promote
  ↓
src/content/lessons/<ITEM-ID>.mdx
generation/<ITEM-ID>.json
review-banks/<ITEM-ID>.json
```

Commands:

```sh
pnpm generation:prepare JAV-001
pnpm generation:validate JAV-001
pnpm generation:promote JAV-001

pnpm validate:content
pnpm validate:reviews
```

`generation:prepare` is deterministic. It resolves a small graph neighborhood:

- target item;
- direct hard prerequisites;
- nearby items in the current module;
- nearest contributing checkpoint;
- project lineage;
- bounded related/deep-dive/foundation/contributes-to context;
- curriculum-provided source.

It does **not** load the entire curriculum into the generation context.

## Staging contract

The agent/researcher creates three files after prepare:

- `source-pack.json` — 1–5 researched authoritative sources; no unsupported claims.
- `lesson-spec.json` — mental model, concepts, coverage matrix, practice, and exactly five review questions.
- `lesson.mdx` — final course artifact following the Astro content contract.

Template files created by prepare are guidance only and intentionally do not pass validation until completed.

## Validation gates

Promotion is blocked unless:

- item is a unit;
- all artifacts use the active curriculum fingerprint;
- every Definition of Done criterion plus challenge has teaching/assessment coverage;
- every curriculum criterion appears in review-question coverage;
- concept source URLs exist in the researched source pack;
- source pack has zero unresolved unsupported claims;
- lesson frontmatter matches Astro content schema;
- direct prerequisite IDs appear in the lesson;
- used source URLs appear in the lesson;
- required course components are present.

Validation writes content hashes. Promotion refuses artifacts modified after the validation run.

## Final generation record

`generation/<ITEM-ID>.json` contains only provenance needed by runtime/build validation:

```json
{
  "itemId": "SQL-001",
  "fingerprint": "sha256:...",
  "sources": [
    { "title": "PostgreSQL Documentation", "url": "https://www.postgresql.org/docs/" }
  ],
  "coverage": [
    {
      "criterionId": "criterion-id",
      "taughtAt": "Core / relational model",
      "assessedAt": "Quiz 1 + challenge",
      "evidenceExpected": "Prediction and executable assertion"
    }
  ],
  "validator": {
    "passed": true,
    "issues": []
  }
}
```

Staging is a working directory and is not source of truth.
