# Learning Workflow

Generation and learning progress are separate systems.

## Core state machine

```text
NOT_STARTED
   ↓ start first session
ACTIVE
   ↓ work can stop after any meaningful step
ACTIVE (continue from last evidence)
   ↓ all original challenge/KPI/project requirements proven
PASSED
   ↓ review interval reached
REVIEW_DUE
   ├─ recall >= 4/5 → REVIEW_PASSED → next interval
   └─ recall < 4/5  → REVIEW_AGAIN → targeted relearn → REVIEW_DUE
```

A generated lesson does not advance this state machine.

## One active task rule

Default learner view shows one active curriculum task. A session may end before the task is complete; the next session resumes the same Task ID from the last recorded evidence/continuation note.

Duration is informative, not a pass condition.

## Session log

Treat session history as append-only evidence:

```ts
type LearningSession = {
  date: string;
  taskId: string;
  result: 'progress' | 'passed' | 'review-passed' | 'review-again';
  evidence?: string;
  continueFrom?: string;
  minutes?: number;
};
```

Do not overwrite the previous session to represent new progress.

## Pass contract

A task becomes `PASSED` only when:

1. all original exit criteria are satisfied;
2. the original micro challenge/project requirement is satisfied where applicable;
3. evidence is recorded.

“Read the lesson” and “generated page exists” are never pass conditions.

## Review contract

Review mode should test recall without notes first. The UI may then reveal targeted remediation for missed concepts.

Default workbook rule:

- `Review passed`: recall score >= 4/5
- otherwise: `Review again`

The generated lesson can contain a review question bank, but review scheduling belongs to the learning-state layer.

## Astro UI mapping

Recommended route behavior:

- `/` → Today/active task + review due
- `/learn/<TASK-ID>` → normal learning mode
- `/review/<TASK-ID>` → recall-first review mode
- `/progress` → queue, session history, evidence, retention

Recommended components:

- `ActiveTask.astro`
- `ContinueFrom.astro`
- `SessionLogger.tsx`
- `EvidencePanel.astro`
- `ReviewMode.astro`
- `ExitCriteria.astro`

## Storage boundary

Initial implementation can use repo-local JSON for deterministic development:

```text
learning/
├─ state.json
└─ sessions.jsonl
```

Later, replace the storage adapter with Google Sheets/Airtable/SQLite without changing lesson content or state semantics.
