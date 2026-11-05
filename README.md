# CS-101 — Engineering Content Library

CS-101 is a **single-page content library** for engineering lessons, practice questions, and project ideas.

**Current content status:** 8 tracks, 67 modules and 370 source-backed curriculum entries. NET-001 (Request Path), SPR-006 (Transfer API), OSX-029 (Binding Mystery), PRD-002 (Health Contract) and JAV-001 (Build Doctor) are authored Pedagogy V3 lessons. All other unauthored units remain outlines.

- One page: `/` with Library and Knowledge Graph modes. Knowledge Graph has an interactive deterministic one-hop SVG node–edge canvas with pan/zoom, selected concept deep links and an accessible text-link alternative; dashed edges are proposed relationships, not prerequisites.
- Cross-domain pilot: `/?mode=graph&concept=http-request-lifecycle&level=G1` and `&level=G2` have distinct competency evidence and mapped units.
- G0, G3 and G4 remain visible as uncurated depth gaps, not fabricated lessons.
- Suggested cross-domain study paths: `/?mode=graph&concept=http-request-lifecycle&level=G1` → `/?item=NET-001&concept=http-request-lifecycle&level=G1` → Materi/Soal (when authored)/Project → next unit. URL context is not learner progress.
- Path traversal uses only reviewed `requires` relations as prerequisites. Current pilot has none; ordered units are editorial suggestions.
- Curated relations and competency outcomes are validated against canonical unit IDs; workbook imports are unchanged.
- Each G1/G2 pilot outcome has a **proposed assessment blueprint** (task, checks, pass conditions, required evidence kind and linked curriculum unit). Graph and contextual Project views show whether a criterion needs design review, a real framework test, a peer-network lab, a packet trace or a Kubernetes test. Local runnable fixtures alone do not satisfy lab/cluster criteria. Rubrics are not automatically scored.
- Sidebar: domain selector, module accordion, and curriculum topics. Mapped lesson Materi pages embed a reusable node–edge preview with a full Graph link; unmapped units show an honest gap and a global Graph entry.
- Content: NET-001 (HTTP/TCP/IP), SPR-006 (Spring MVC Transfer API), OSX-029 (Linux bind and namespace), PRD-002 (health probes) and JAV-001 (Java 21 JDK/Maven Build Doctor) are authored with five self-check questions and bounded executable proof each. The other 365 units remain outlines.
- JAV-001's JDK 21 JavaCompiler fixture proves compile-time versus runtime class-loading failures, not actual Maven verify or executable JAR packaging. SPR-006's Java fixture proves HTTP protocol behavior, not Spring integration. OSX-029's Node fixture proves local bind only. PRD-002's Node HTTP fixture simulates state-driven /live and /ready statuses; actual database failure, Spring Boot Actuator wiring and Kubernetes routing/restart behaviors require separate integration verification.
- Editorial competency rubrics and graph relations remain proposed; published content does not imply assessment mastery. Spring Boot can reject new probe connections during graceful shutdown even while the local PRD-002 fixture returns HTTP 503 for drain.
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
