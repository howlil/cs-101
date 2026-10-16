# CS-101 — Engineering Content Library

CS-101 is a **single-page content library** for engineering lessons, practice questions, and project ideas.

- One page: `/`
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

The canonical curriculum is `curriculum/manifest.v2.json`. Only authored units have full MDX lesson content; the remaining units show honest outlines and manually defined challenges.

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
