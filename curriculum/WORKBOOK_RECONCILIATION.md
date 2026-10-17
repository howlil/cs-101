# Curriculum source reconciliation — 2026-10-18

## Sources inspected

- **New attached workbook**: 8 worksheets — Java, Spring Boot, Database, OS & Linux, Networking, Software Testing, System Design, Production Engineering.
- New workbook SHA-256: \`4cc54ad3f9c6c15ea9dc751b0e54481458add63ead0293ab960e774ec946b3c0\`.
- **Published runtime baseline**: \`curriculum/manifest.v2.json\`, whose existing \`import-report.json\` records an older source SHA-256 \`63187b8f134b37ea67cf9361644c57c9680244f99604d1865735df343bcebcd5\`.
- Existing import report: 7 tracks, 43 modules, 206 items (163 units, 40 checkpoints, 3 integrations), 637 relations. This report is **not** an import of the new workbook.

## Worksheet → current-track mapping (proposed; not executed)

| Workbook sheet | Existing manifest track | Reconciliation required |
|---|---|---|
| Java | \`java\` | Match individual units and acceptance criteria |
| Spring Boot | No dedicated track; some Spring topics currently under \`java\` (e.g. \`JAV-013\`, \`JAV-016\`) | **Structural change**: decide track/module ownership and stable-ID strategy |
| Database | \`db-sql\` | Compare SQL units, project checkpoints and criteria |
| OS & Linux | \`os-linux\` | Correct anomalous worksheet header (A1 currently \`3\`) in a separate approved source revision |
| Networking | \`networking\` | Exact mapping review |
| Software Testing | \`software-design-quality\` (broader scope) | Separate testing content from software design and quality without losing existing items |
| System Design | \`distributed-system-design\` (broader scope) | Review distributed-systems subtopics absent from workbook |
| Production Engineering | \`production-engineering\` | Exact mapping review |

Workbook rows cannot be compared one-for-one with manifest items. The workbook contains headers, source text, gates and task descriptions; the manifest contains normalized units, checkpoints and integration exercises. **Do not claim added/removed counts from comparing their totals alone.**

## Safe application gates

1. Run \`pnpm import:curriculum -- /absolute/path/kurikulum.xlsx --dry-run\`; capture \`added\`, \`removed\`, \`changed\`, warnings and hashes. Do not commit or publish this first result automatically.
2. Review ID mappings for renamed, split, merged or moved topics, especially Spring Boot. Stable IDs may be kept only for unchanged competency contracts; fingerprint mismatches must trigger authored-content regeneration and re-review.
3. Resolve graph relations with exact target IDs; never infer ambiguous dependencies. Check that links to project checkpoint requirements are still valid.
4. Confirm generated authored MDX, generation provenance and review banks match resulting fingerprints, then run the full CI and smoke tests.
5. Only promote a reconciled \`manifest.v2.json\` after reviewing the report and content-migration plan.

## Current implementation scope

PR #37 adds pedagogical metadata and content-first scaffolding to JAV-001, JAV-002 and SQL-001 **without modifying the canonical manifest or imported workbook**. It is deliberately separate from this source-data migration.
