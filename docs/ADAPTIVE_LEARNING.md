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

## Later phases (not implemented)

Artifact-to-criterion proof, credential-level mastery, full multi-item competency analytics, authenticated multiuser progress, and adaptive FSRS scheduling remain separate projects.

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

## Adaptive learning v2.1 — deterministic next-action and transferable evidence

Source of truth: `competency_attempts` and `competency_review_schedule`; `item_study` and formal `passed` remain **independent**. Assessment attempts must never silently unlock technical checkpoints.

- `src/domain/learning/next-action.ts` maps assessment plans to the next learning action. Today skips units whose independent assessment is awaiting delayed recall, but does not mark them studied or passed.
- SQL-001: wrong initial prediction → independent transfer question about IS NULL → second distinct transfer case if needed. Correct after viewing feedback on the same question is **not** unassisted understanding. Once all authored fresh prompts have been tried, show a supportive explanation and allow normal study, never trap the learner behind a forced re-test.
- `migrations/0006_assessment_evidence.sql` and `006-assessment-evidence.ts` rebuild the attempt table with a transfer phase and preserve old rows with `outcome='legacy_unknown'`. Historical answers are not retroactively assigned an assistance state.
- The question bank is bound to SQL-001's exact curriculum fingerprint. Mismatches disable the bank until reviewed; submissions with mismatched fingerprints are rejected.
- SQLite and D1 `export()` now include competency attempts and schedules, under an export payload version **5**. Export format versions do not need to equal DB schema versions (DB v6).
- React lesson owns a shared revision. HTTP conflicts carry stable error codes; stale revisions can be reconciled once while preserving idempotency receipts for uncertain network outcomes.
- Micro-review queue is bounded by 3 questions and an estimated 300 seconds. Time estimates are heuristic, not measured. Legacy 5-question review remains separately scheduled.
- `GET /api/learning-plan` remains server-owned and sends no answer keys; client-side MDX quizzes are formative only.
- **Security release gate:** the current application uses a single learner row (`learner_state.id=1`) and has no app-level identity check. For public deployment of private progress, enforce authenticated access at the edge (Cloudflare Access) or implement learner-aware authorization for progress APIs. Origin checks are not authentication. This PR does **not** assume or change the intended public/private deployment mode.
- **Rollout gate:** migrate production D1 through 0006 before deploying Worker code that reads the new columns. Verify backup, schema version, rollback and authorization. CI's D1 shim is insufficient to prove real multi-writer race behavior.
