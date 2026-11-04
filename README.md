# CS-101 — Engineering Content Library

CS-101 is a **single-page content library** for engineering lessons, practice questions, and project ideas.

**Current content status:** 8 tracks, 67 modules and 370 source-backed curriculum outlines; no published authored lessons. Outlines are not complete lessons.

- One page: `/` with Library and Knowledge Graph modes.
- Cross-domain pilot: `/?mode=graph&concept=http-request-lifecycle&level=G1` and `&level=G2` have distinct competency evidence and mapped units.
- G0, G3 and G4 remain visible as uncurated depth gaps, not fabricated lessons.
- Suggested cross-domain study paths: `/?mode=graph&concept=http-request-lifecycle&level=G1` → `/?item=NET-001&concept=http-request-lifecycle&level=G1` → Materi/Soal (when authored)/Project → next unit. URL context is not learner progress.
- Path traversal uses only reviewed `requires` relations as prerequisites. Current pilot has none; ordered units are editorial suggestions.
- Curated relations and competency outcomes are validated against canonical unit IDs; workbook imports are unchanged.
- Each G1/G2 pilot outcome has a **proposed assessment blueprint** (task, observable checks, pass conditions, linked curriculum units). The graph shows the complete rubric, and a contextual Project view shows criteria for only its mapped unit. These are human-review guides, not published quizzes or automatically scored submissions.
- Sidebar: domain selector, module accordion, and curriculum topics.
- Content: authored MDX lessons with interactive self-check quizzes, or an explicit curriculum outline when content is not yet authored.
- Projects: project checkpoints and integration challenges from the curriculum manifest.
- No learner account, progress, study sessions, evidence submission, spaced repetition, database reads or writes.
- Existing Cloudflare D1 data is **not deleted** by this refactor. The application simply stops using the binding.

## Local

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm ci
```

## Cloudflare Workers

```sh
pnpm run build:cloudflare
npx wrangler deploy
```

Workers Builds:
- Build: `pnpm run build:cloudflare`
- Deploy: `npx wrangler deploy`
- Root: `/`

Cloudflare no longer needs the `LEARNING_DB` binding or migrations.

## Generate lessons

The canonical curriculum is `curriculum/manifest.v2.json`. Once a new reviewed curriculum is imported, only authored units will have complete MDX content; other units will display verified outlines.

```sh
pnpm generation:prepare JAV-003
# fill staged source-pack, lesson-spec and lesson.mdx
pnpm generation:validate JAV-003
pnpm generation:promote JAV-003
pnpm ci
```

Generator outputs:
- `src/content/lessons/<ID>.mdx` — study material, practice, challenges
- `generation/<ID>.json` — provenance + coverage
- `review-banks/<ID>.json` — reusable question bank (not a scheduled review system)

Projects/integrations are rendered directly from the curriculum manifest. Old deep links redirect to `/?item=<ID>`.
