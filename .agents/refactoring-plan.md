# CS-101 — UI folder boundaries: refactor plan

**Status: UI ownership migration implemented in stacked PRs #16–#18, awaiting merge; legacy data compatibility retained** · 9 Oktober 2026.

This plan extends the **active** [`architecture.md`](architecture.md) and [`AGENTS.md`](../AGENTS.md). Refactor must improve *change locality* rather than optimize directory count; do not introduce `features/` or layers of `application/use-cases/ports/repositories`.

## Current baseline and invariants

- Backend architectural work from PR #11 is **done**: `src/domain/learning/decisions.ts`; `src/server/learning/{contract,sqlite,d1}.ts`; `scripts/validate-architecture.ts`; `pnpm validate:architecture`. Do not repeat/revert it.
- Migration result: `components/app` owns global search/theme; `components/lesson` owns MDX blocks + Quiz/Reveal; `components/learning` owns evidence/session/review; project disclosure is colocated with its page. The retired component folders are removed.
- Keep Astro SSR + ClientRouter, learner `no-store`, manifest, staged lessons, evidence/review API, fingerprint, idempotency/revision conflicts, SQLite/D1 state parity and Cloudflare handling unchanged.
- Build-time content generation **never** writes learner progress. Legacy V1 adapters remain until consumer/migration tests prove safe removal.
- `arc` source folders, file-based Astro route directories, `domain` boundaries and existing `server/learning` split are deliberate. Do not flatten or introduce parallel implementations.

## Ownership map — concrete moves

| Current file(s) | Target location | References to update atomically |
| --- | --- | --- |
| `components/search/CurriculumSearch.tsx`, `curriculum-search.module.css` | `components/app/` | AppShell imports; command palette Ctrl/⌘ K and style references |
| `components/ui/ThemePreference.tsx` | `components/app/` | AppShell import; theme localStorage and SSR parity |
| `components/course/{MentalModel,ConceptGraph,Quiz,Challenge,ExitCriteria,SourceList,Reveal,LessonStage}.astro` | `components/lesson/` | All MDX content, demo, generator template, validators/tests |
| `components/ui/QuizClient.tsx`, `quiz.module.css`, `RevealAccordion.tsx` | `components/lesson/` | Quiz.astro/Reveal.astro imports and CSS Module |
| `components/course/{SessionLogger,ProjectEvidence,IntegrationEvidence,ReviewAttempt}.tsx` | `components/learning/` | Lesson/Project/Integration/Review page compositions |
| `components/project/GuaranteeAccordion.tsx` | Colocate within `ProjectPage.tsx` *or* next to it (not a category) | Verify no second consumer before collapse |
| `components/arc/**`, `components/curriculum/**`, `components/pages/**`, `components/ui/{ActionLink,EmptyAction}*` | **Keep** | No unnecessary move or barrels |

`src/components/learning/{ActivateItem,EvidenceForm,ItemStatusAction,client}.ts(x)` stays. `src/styles/` stays. MDX source stays in `src/content/lessons/`.

## Sequence: one small PR per change surface

### PR A — App shell UI locality (low risk)

Move global search and theme preference to `components/app/`; correct imports, CSS path references and any path-based tests. **No behavioural redesign**.

**Gate:** `pnpm validate` (includes `validate:architecture` + `validate:ui`), `pnpm test`, `pnpm check`, `pnpm build:node`, Chrome search/theme/mobile/ClientRouter tests. Rollback = revert PR A only.

### PR B — Lesson MDX ownership (medium risk)

Move only presentation blocks and quiz/reveal island components to `components/lesson/`. In the **same PR**, change imports in `src/content/lessons/JAV-001.mdx`, `SQL-001.mdx`, `SQL-002.mdx`, `demo.mdx`, and `.agents/skill/course-generator/assets/lesson-template.mdx`; update generator references, source files, and test assertions that depend on import paths.

**Gate:** `pnpm validate`/test/check/build:node; SSR on three authored lesson routes and demo; stages Pahami/Latihan/Bukti and quiz/reveal hydration, generator/template path validation. Where `generation:validate` requires staging inputs, prepare a valid fixture first—do not point it at production. Rollback all moves and imports atomically.

### PR C — Learning/evidence feature locality (medium risk)

Move SessionLogger, ProjectEvidence, IntegrationEvidence, ReviewAttempt to `components/learning/`. Update consuming pages, validate unchanged API request semantics, revise path tests. Verify one-consumer GuaranteeAccordion and colocate if it improves maintenance; remove empty `course/search/project` dirs only after A+B+C.

**Gate:** `pnpm validate`/test/check/build:node; lesson/project/integration/review SSR and browser smoke; SQLite/D1 parity on evidence/activation/reviews, retry, revision conflicts and rollback. No changes to completion logic or schema.

### PR D — Compatibility review and boundary enforcement (conditional)

Existing `scripts/validate-architecture.ts` already enforces domain/server/Arc dependency direction. **Extend it**, after C has merged, to reject imports from retired `course/search/project` paths and unwanted cross-feature coupling; allow legitimate composition like `app/AppSidebar → curriculum/CurriculumExplorer` and `components/pages → features`.

Review `domain/curriculum.ts` + `domain/curriculum-v2/legacy.ts`, `api/active-task`, historical manifests and migration consumers. **Do not remove** legacy endpoints/data without explicit compatibility tests and release agreement. Backend shared-contract extraction is *already done* in PR #11; any additional rule extraction needs a separate evidence-backed problem.

**Gate:** path graph/static checker, migration/backfill/export fixtures, historical endpoint test, SQLite/D1 parity. If not proven safe, preserve compatibility and close review as retained.

## Dependency and extraction test for every follow-up PR

`Astro routes/layout → server/SSR + page composition; pages UI → app/curriculum/lesson/learning/ui + Arc; feature UI → Arc and domain types/view-models, HTTP client for mutation; server → domain/persistence; domain → domain; Arc → primitives only.` Cross-boundary imports require concrete consumers and no cycles.

Before creating a folder/interface ask: Which single owner changes this code? Is this needed by ≥2 consumers, or does it isolate a tested necessary boundary? Does it make a typical feature change touch fewer places? If not, colocate. Do not add per-file directories, barrel exports, controllers, DI, generic helpers or repositories just to look clean.

## PR acceptance and stop conditions

Each PR records before/after file mapping, exact changed imports, test evidence, and independent rollback. A structural PR **must not** mix code moves with CSS redesign, dependency upgrades, runtime schema/API changes or Cloudflare deployment. Failures in build, content validation, generated MDX, keyboard focus, review/evidence, Node/SQLite/D1 parity, or the UI QA block merge.

- [x] A: Search/theme grouped under App
- [x] B: Lesson blocks + MDX content/template references migrated atomically
- [x] C: Evidence/review UI grouped under Learning; orphan folders removed
- [x] D (UI): Boundary checker extended to reject retired UI folders/imports
- [ ] D (data): V1 storage compatibility is deliberately retained pending backfill/export and D1 migration tests
- [x] Active `architecture.md` / `AGENTS.md` / generator references updated to **actual** paths; engineering design remains a historical target, not runtime authority
- [ ] `master` CI green after each merge; production Cloudflare deploy verification remains a separate gate

