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
