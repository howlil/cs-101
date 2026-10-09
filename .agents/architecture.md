# CS-101 — Architecture boundaries

Status: **active engineering contract** · 9 Oktober 2026

## Core model

CS-101 has two independent lifecycles:

- **Curriculum/content at build time:** source → importer → Manifest V2 → graph → MDX/review bank.
- **Learning at runtime:** browser → HTTP/SSR → business decision → SQLite/D1 transaction → snapshot → UI.

Manifest V2 owns scope, criteria, prerequisites and fingerprints. Learner database owns active item, progress, session/evidence, revision, and review schedule. Browser localStorage owns draft/theme/preferences **only**; it must never be the authority for completion.

Dependencies move in one direction: **UI / Astro routes → server orchestration → domain decisions**. Domain never imports server, database adapters, React, or Astro.

## Folder ownership

| Location | Owns | Does not own |
| --- | --- | --- |
| `curriculum/`, `review-banks/`, `src/content/` | Immutable/versioned curriculum, lessons, review banks | Learner state |
| `scripts/`, `generation/` | Import, validate, generate, promote content artifacts | Runtime HTTP business logic |
| `src/domain/curriculum-v2/` | Curriculum schemas, graph, selectors and dependency semantics | UI copy or persistence |
| `src/domain/learning/` | Learning input schema, pure decisions, availability and view projections | SQL, HTTP and React |
| `src/domain/review/` | Review grading and interval policy | Database updates |
| `src/server/learning/contract.ts` | Shared learning snapshot data type | Persistence implementation |
| `src/server/learning/sqlite.ts` | Local SQLite reads, writes, revision and transaction implementation | New business policy |
| `src/server/learning/d1.ts` | Cloudflare D1 reads, conditional writes and transaction implementation | New business policy |
| `src/server/runtime.ts` | Select adapter at runtime | Business decisions |
| `src/server/request-snapshot.ts` | Cache snapshot within a single SSR request | Global learner cache |
| `src/pages/api/` | HTTP envelope/transport, request routing | SQL and domain rule duplication |
| `src/pages/**/*.astro` | SSR route, load data/MDX, project serializable props | Duplicate business decisions |
| `src/layouts/` | App shell/navigation | Data persistence |
| `src/lib/connection-view.ts` | UI connection labels and link projection | Curriculum graph semantics |
| `src/components/arc/` | Source-owned UI primitives | Product/domain imports |
| `src/components/ui/` | Reusable product compositions | Primitive reimplementation and DB access |
| `src/components/{app,pages,curriculum,lesson,learning}/` | Feature/page interactions and render | Direct server database access |

Existing component folders remain; do not add a parallel `features/` hierarchy.

## UI component boundaries (migration target)

Backend ownership in this file is **already implemented and active** (shared decisions + `src/server/learning/{contract,sqlite,d1}.ts`). UI folder migration is **planned**, not implemented. Full checklist: [`refactoring-plan.md`](refactoring-plan.md).

```text
Astro routes/layout → page compositions and server/SSR
page compositions → app/curriculum/lesson/learning/ui + Arc
lesson MDX → lesson presentation blocks + interactive quiz/reveal
learning UI → HTTP API + domain types/view models + Arc
server → domain rules + SQLite/D1 (never React)
domain → domain (never server, browser, Astro UI)
Arc → generic React/Radix primitives (never CS-101 domain)
```

Authored MDX/lesson presentation blocks now live in `lesson`; session/evidence/review UI now lives under `components/learning` and GuaranteeAccordion is colocated with ProjectPage. `components/app` now owns search and theme preference; the one-consumer `project/GuaranteeAccordion` should be colocated, not expanded into a new architecture slice. Page compositions remain flat in `components/pages`. `components/arc/*` directories stay separate for source-owned styles. Keep legitimate composition dependency `app/AppSidebar → curriculum/CurriculumExplorer`.

**Folder creation test:** does the directory own a stable behaviour/contract, or contain files changed together? If no, colocate. No abstraction just for a clean-looking tree, no barrel exports per folder, no special import API unless it measurably reduces coupling. The current `pnpm validate:architecture` enforces core cross-layer restrictions; only add folder-specific checks after the move.


## Place new code by ownership

1. **Prerequisite/completion/evidence/review eligibility changes:** update one pure function in `src/domain/learning/decisions.ts` or existing domain rules. Cover it with a focused test.
2. **Storage mutation:** both adapters consume shared rules. SQLite can use `BEGIN IMMEDIATE`; D1 uses its own conditional/batch semantics. Do not abstract SQL into per-table repositories.
3. **Page composition:** SSR routes assemble props from graph selectors, snapshots and reused presentation mappers. If two routes repeat a substantial deterministic transformation, extract it *once* to an existing selector/view-model or `src/lib/`.
4. **Interactive UI:** check `src/components/arc/` before introducing a primitive. Keep domain components out of Arc. Components receive server data as serialized props or via HTTP API.
5. **Content generation:** scripts validate/promote manifests and MDX outside the request lifecycle; generation does not mutate learner progress.

## Business invariants

- Completion requires evidence for all criteria; having an MDX lesson is never a completion prerequisite.
- A stale fingerprint means the old completion cannot unlock prerequisites or reviews.
- Selecting/browsing curriculum never changes the active learning item.
- A concurrent revision mismatch returns 409; invalid operations return 422.
- Identical retried `requestId` must not double-apply a mutation. All related state/receipt/review writes must maintain the guarantees of their adapter.
- SSR private progress remains `Cache-Control: no-store`.
- `taskId` / `activeTaskId` / `task_progress` / `/api/active-task` / V1 manifest adapters are temporary compatibility. **Do not expand their usage**, and do not remove before migration, history, export, and consumers are verified.

## Lean architecture rules

Do **not** create generic use-case classes, controller layers, dependency injection containers, per-table repositories, or one-file re-export directories merely to look like Clean Architecture. Make a new abstraction only when it owns a distinct rule, handles a real platform boundary, or eliminates duplication between actual consumers.

One domain decision + two persistence-specific implementations is preferred over a full ports/adapters framework. Avoid moving files without a measurable boundary benefit.

## Mandatory validation

Before integrating feature changes:

```sh
pnpm validate:architecture
pnpm validate:ui
pnpm test
pnpm check
pnpm build:node
```

When state/persistence changes, cover revision conflict, idempotency, rollback, stale fingerprint, completion criteria, review state, and SQLite/D1 parity. The existing D1 simulator is *not* proof of real D1 concurrency behavior.

## Future migration backlog (not a license to refactor opportunistically)

1. Retire V1 dual-write only with historical compatibility and migration tests.
2. Consolidate view projections where repeated transformations are proven, without introducing extra page-controller layers.
3. Add further pure shared state-transition decisions only when real duplicated rules are identified.

This is the active boundary contract. Older target trees in `.agents/engineering-design.md` are aspirational and must not override active ownership.
