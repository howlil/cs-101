# CS-101 — Folder boundary refactoring plan

Status: **PLANNED / NOT IMPLEMENTED** · Baseline: `master` `ad8c5d4` · 9 Oktober 2026

Read with [`AGENTS.md`](../AGENTS.md) and [`engineering-design.md`](engineering-design.md). Target: smaller change surface and explicit owner without new layers. No behaviour, schema, deploy, or endpoint changes in structural PRs.

## Invariants and baseline

- Astro file routing, SSR `ClientRouter`, authenticated/private learner state `Cache-Control: no-store`, SQLite/D1 parity, generated MDX, review banks, fingerprint, activation, and evidence completion must be unchanged.
- Approximate audit baseline: 199 files, 58 non-empty directories, 70 files in `src/components/`; `arc/` has 31 files in source-owned primitive folders. Folder count **is not** a success KPI.
- `pnpm validate` (curriculum, content, reviews, UI), `pnpm test`, `pnpm check`, `pnpm build:node` and CI Chrome browser smoke currently act as gates. `generation:validate` expects staging input; run it only with a prepared valid generation fixture/bundle, never point it at production resources.
- Preserve generated artifact contents and timestamps where possible; changes to content metadata/fingerprints must be prohibited in a move-only PR.
- All import changes need a search across TS/TSX/Astro/MDX, tests, code-based validators, `.agents/skill/course-generator` instructions/assets/references, and config. Do not assume TS check detects a string path in a generator prompt.

## Dependency ownership after migration

`Astro route/layout → page compositions + server/domain → feature components (app/curriculum/lesson/learning/ui) → Arc`.
`server → domain + persistence`. `domain` has no `server`/UI dependency. Feature UI never imports `src/server/`. No cross-feature import except composition edges used by app sidebar and page workspaces. No circular dependencies. `UIArc` remains the primitive owner; `src/components/pages` remains flat until there is real growth pressure.

## Move map (atomic source+consumer updates)

| Current | Target | Scope / caveat |
| --- | --- | --- |
| `src/components/search/CurriculumSearch.tsx` + `curriculum-search.module.css` | `src/components/app/` | Update AppShell import; keep global Ctrl/⌘ K behavior. |
| `src/components/ui/ThemePreference.tsx` | `src/components/app/` | Update AppShell import; no new theme module. |
| `src/components/course/{MentalModel,ConceptGraph,Quiz,Challenge,ExitCriteria,SourceList,Reveal,LessonStage}.astro` | `src/components/lesson/` | All MDX + generator template imports must move in one PR. |
| `src/components/ui/QuizClient.tsx` + `quiz.module.css` | `src/components/lesson/` | Update Quiz.astro relative import, avoid duplicate island. |
| `src/components/ui/RevealAccordion.tsx` | `src/components/lesson/` | Update Reveal.astro import; keep Arc accordion. |
| `src/components/course/SessionLogger.tsx` | `src/components/learning/` | Update LessonPage import; wrapper may be inlined only in separate behavioural review. |
| `src/components/course/ProjectEvidence.tsx` | `src/components/learning/` | Update ProjectPage import; leave evidence semantics unchanged. |
| `src/components/course/IntegrationEvidence.tsx` | `src/components/learning/` | Update IntegrationPage import; leave evidence semantics unchanged. |
| `src/components/course/ReviewAttempt.tsx` | `src/components/learning/` | Update ReviewPage import; preserve review API/revision semantics. |
| `src/components/project/GuaranteeAccordion.tsx` | Local `ProjectPage.tsx` component **or** alongside page as a single file | Only collapse when one consumer confirmed; do not create a new `project/` category. |
| `src/components/arc/**`, `src/components/curriculum/**`, `src/components/pages/**`, `src/components/ui/{ActionLink,EmptyAction}*` | Keep | Correct stable boundaries, do not flatten UIArc or per-route components. |

Existing `src/components/learning/{ActivateItem,EvidenceForm,ItemStatusAction,client}.ts(x)` remain. Existing top-level `src/styles/` remains; this is **not** a redesign or CSS rewrite.

## Staged PRs and acceptance

### PR A — Global application UI relocation (low risk)

Move `search/CurriculumSearch*` and `ui/ThemePreference` to `app/`. Update imports, CSS module relative references and path assertions. No state changes.

**Done when:** header search, Ctrl/⌘ K, theme persistence, mobile nav and SSR navigation pass CI + browser test; no stale `search/` imports remain. Easy rollback: revert only PR A.

### PR B — Lesson MDX and interactive blocks (medium risk)

Move `course/*.astro` to `lesson/`; also move `QuizClient`, `RevealAccordion`, and `quiz.module.css`. Update Astro-relative imports, all authored `src/content/lessons/{JAV-001,SQL-001,SQL-002,demo}.mdx`, `.agents/skill/course-generator/assets/lesson-template.mdx`, `.agents/skill/course-generator/references/repo-architecture.md`, related generator documentation, any path-based validators/test fixtures. Preserve `LessonStage` boundary markup, quiz/reveal behaviour, source metadata, content hashes.

**Done when:** `pnpm validate`, `pnpm test`, `pnpm check`, `pnpm build:node` pass; rendered SSR routes for all three lessons + demo include expected stages/quiz; a valid generator fixture still produces a correct MDX lesson; no orphan `course/` import to moved lesson components. Rollback by reverting entire atomic PR.

### PR C — Learning evidence and project-local composition (medium risk)

Move `SessionLogger`, `ProjectEvidence`, `IntegrationEvidence`, `ReviewAttempt` to `learning/`. Update imports from page compositions, preserve `EvidenceForm` contracts. After scanning consumers, inline or colocate the 17-line `GuaranteeAccordion` in ProjectPage; delete empty `project/` and `course/` directories. Avoid altering submission UI or API payloads.

**Done when:** 4 workspace routes (Lesson, Project, Integration, Review) pass SSR/browser checks; SQLite/D1 evidence, activation, revision-conflict, idempotency and review tests pass; no new shared folder/abstraction.

### PR D — Server contract decoupling (medium/high risk; separate from all UI moves)

Extract `LearningError` and `LearningSnapshot` from `server/learning.ts` to `server/learning-contract.ts` only if shared contracts still exist in both runtime classes. Update `cloudflare-learning.ts` and consumers, keep runtime adapter selection intact. Audit `saveSession`, `setActiveItem`, `submitReview`, `snapshot` side-by-side: identify duplicated **business** logic vs storage-specific atomicity. Only extract a pure shared rule when tests prove both paths equivalent; never add repository/unit-of-work/usecase class by default.

**Done when:** SQLite/D1 parity suite, requests/revision conflict, idempotent retries, review schedule, D1 batch/error behavior and Node build succeed. No runtime persistence semantics change. Rollback this PR alone.

### PR E — Legacy/compatibility audit (conditional; do not delete without proof)

Review `domain/curriculum.ts`, `domain/curriculum-v2/legacy.ts`, `/api/active-task`, `manifest.json` and migration tests. Map consumers including old clients and exports. Delete only after explicit API/migration/backfill tests prove old data and requests no longer require them.

**Done when:** zero supported consumers plus passing historical migration/export test; if uncertain, **retain**.

## Boundary verification and future development

After PR C, add/update import boundary validation (avoid a new bulky lint framework unless existing validator cannot express it):

- Disallow `src/components/*` → `src/server/*` or DB packages.
- Disallow `src/domain/*` → `src/components/*`, `src/pages/*`, `src/server/*`, React or browser UI.
- Disallow `src/server/*` → `src/components/*`.
- Disallow direct Radix/native interactive primitives outside `arc/` using existing `validate-ui-boundary.ts`.
- Enforce no new `course/`, `search/`, `project/` folders **only after** their migrations have merged.
- Keep legitimate composition edges (e.g. `app/AppSidebar → curriculum/CurriculumExplorer` and `pages → feature components`).
- Prefer tests on actual import graph/TypeScript AST over brittle filename grep if adding automated structural enforcement.

## Change-locality rubric and stop conditions

For each future feature PR, answer: (1) Who owns state? (2) What files change together? (3) Which dependency direction is added? (4) Would a new directory or interface make this easier than colocating? (5) What invariant/test proves it?

**Stop/refuse a structural PR** if it mixes unrelated design tweaks, upgrades dependencies, changes D1/SQLite behavior, rewrites generated MDX, modifies API semantics, introduces a new multi-layer architecture, or passes tests without updating hidden path references. PR descriptions must contain before/after path map, no-behavior-change confirmation, test outputs, risks, and rollback instructions.

## Completion checklist

- [ ] PR A: app search/theme UI colocated
- [ ] PR B: MDX lesson components + source/template references moved and validated
- [ ] PR C: learning evidence/review UI colocated, orphan folders removed
- [ ] PR D: cross-adapter shared contract separated; behavior parity demonstrated
- [ ] PR E: legacy compatibility audited, retained or safely removed
- [ ] Boundary checker enabled for **implemented** layout
- [ ] `AGENTS.md`, engineering/design docs, generator reference, template and tests match final runtime paths
- [ ] Master CI green after each squash merge; Cloudflare deploy verification separate from Node CI
