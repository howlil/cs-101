# CS-101 generation pipeline

The curriculum manifest specifies the syllabus; the generator authors **lesson explanations, local practice questions, and practical challenges**. Each project checkpoint is displayed directly from the manifest as an idea project.

For one unit:
```sh
pnpm generation:prepare JAV-001
# research and write source-pack.json, lesson-spec.json and lesson.mdx
pnpm generation:validate JAV-001
pnpm generation:promote JAV-001
pnpm ci
```

Workflow: bounded curriculum graph context → curated primary sources → lesson specification → MDX content → five-question bank → content/coverage validation → publish.

Derived outputs:
- `src/content/lessons/<ID>.mdx`: authored content with understand/practice/self-verification sections.
- `generation/<ID>.json`: provenance, mapped criteria, validation.
- `review-banks/<ID>.json`: legacy-named static question bank with five explained questions, no review schedule.

`evidenceExpected` in the generation schema describes an **observable local acceptance criterion** only. There is no user progress, evidence submission, persisted quiz score, or learner database. Validation and generation must never create these behaviors.

## Pedagogical v2 pilot

The optional backwards-compatible \`lessonSpec.pedagogy\` field holds an ordered set of atomic segments with worked examples, 2–3 progressive hints, independent challenges, and an explicitly linked project checkpoint. The generator skill requires this field for newly authored lessons; existing v1 specs remain readable during migration. Pilot metadata is stored at \`generation/pedagogy/JAV-001.json\`, matched to the canonical unit fingerprint, and checked by \`pnpm validate:pedagogy\` in CI.

The v2 content contract reduces instructional friction, **not** engineering acceptance thresholds. Hint reveal is local and optional. Do not add progress persistence, learner databases, spaced-review schedules, mandatory timers, or score uploads.
