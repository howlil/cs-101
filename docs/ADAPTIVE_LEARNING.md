# Low-friction learning — phase 1

## Contract

- Every unit remains browseable; one click **Tandai dipelajari** records self-reported study progress without activation, mandatory text, or evidence.
- `item_study` is independent of existing item completion. **Studied is not passed/verified**. Projects and integration exercises still use the original proof contract.
- Unit prerequisites are advisory for unit navigation. Studied units satisfy foundational prerequisites of checkpoints; previous project checkpoints still require formal passes.
- Evidence collection on unit pages remains available under an optional disclosure after activation.
- Existing `item_progress`, `sessions`, review schedules and receipts are preserved. Review remains tied to formal passes.
- The same revision and requestId rules apply to SQLite and Cloudflare D1.

## Rollout

Migration `0004_study_progress.sql` is additive. Update SQLite via `openDatabase` and apply D1 migration before running the new Cloudflare Worker code; snapshot queries require `item_study`.
The repository's existing `build:cloudflare` script invokes `migrate:cloudflare` against the remote DB when `WORKERS_CI=1`. This existing deployment behavior is **not** a safe general migration strategy; review it before running a production build.

## Phase 2 (not implemented)

Per-competency authored quiz policy, server-side quiz grading, artifact-to-criterion proof, credential-level mastery, stable criterion IDs, and review-without-pass require separate schemas and QA.

## Adaptive assessment v2 — SQL-001 vertical slice

The learner journey is: **predict → server-graded feedback → retrial (if needed) → one-question delayed recall**.
This is a verified assessment of the selected SQL NULL behavior, not verified project mastery.

### Trust and lifecycle

- `src/server/assessment-bank.ts` owns answer keys and misconception mappings. Client requests only get public prompts/options.
- `src/domain/learning/assessment.ts` owns grading, version checks, and bounded scheduling decisions. No LLM or arbitrary execution is in the authority path.
- `competency_attempts` stores successful, incorrect and recall attempts append-only, with unique `request_id`. No extra mandatory reflection or evidence input is required.
- `competency_review_schedule` is independent of legacy `review_schedule`, `passed`, and `item_study`. Initial spacing is 1/3/7/14/30 days after a successful retrieval. Wrong delayed recall returns to day 1; missing a day does not erase knowledge or completion.
- `src/domain/review/budget.ts` limits visible due items to 3 by default. Overdue records remain in storage. These fixed defaults are UX heuristics, not a validated optimal personalized schedule.
- `POST /api/assessment-attempts` shares the existing revision and request-receipt strategy with other learning mutations. D1 guards writes with a receipt nonce; SQLite uses BEGIN IMMEDIATE. Every response has no-store headers.
- `GET /api/learning-plan?itemId=SQL-001` and `GET /api/review-queue` expose only public prompts. `/learn/SQL-001#practice` hosts the assessment.
- Existing formative QuizClient and SQL-001 18/20 project-like evidence criteria are preserved; neither is silently upgraded into authoritative mastery.

### Rollout / safety

Migration 0005 is additive. Node upgrades through the TypeScript migration registry automatically. Cloudflare D1 requires `0005_adaptive_assessment.sql` before worker code reads the new tables. **Do not deploy a new worker without the corresponding schema migration.** Existing deploy scripts have their own remote migration behavior; audit deployment configuration separately.

### Verification

Required checks: `pnpm validate`, `pnpm test`, `pnpm check`, `pnpm build:node`, browser QA, SQLite/D1 parity and an actual D1 integration check where possible.
The D1 parity shim based on Node SQLite is not proof of real Cloudflare multi-writer races.

### Not in this slice

Adaptive AI tutor, trusted arbitrary code execution, auto-grading 20 SQL traps, competency-wide analytics, FSRS fitting, and multi-user personalization are **not implemented**. The current database is designed for one learner; multi-user support needs a separate identity and isolation design.
