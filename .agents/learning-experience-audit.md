# CS-101 learning experience audit — 2026-10-10

## Product contract and evidence

**Target:** a solo software-engineering learner studying a 7-track, 43-module, 206-item curriculum. The user wants to finish one authentic piece of work per session, recall concepts, and resume reliably. Real learning state must remain server-owned; a locally saved draft is not a committed session.

**Method — product-design → design-graph:** context → job/outcome → observable success journey → breaks/variants → constraints → smallest useful changes → browser/test proof. Reviewed actual page compositions, React/Astro behavior, authored/outline availability, CI screenshots and existing product design contract. This is an implementation review, **not** a claim of usability testing with external learners.

### Job, flow, states

```text
Open CS-101
    |
    v
Hari Ini: next meaningful task → Curriculum: orient within track/module
    |
    v
Lesson: Pahami [full authored / outline-only] → Latihan [quiz / manual]
    |                                         |                                      → missing prerequisite: read/practice only
    v
Bukti: eligible? → activate → record one next step / concrete evidence
    |                         |                      → save partial session (keeps continuation)
    v
All criteria evidenced → server completes item → review scheduled
    |
    v
Due review + current question bank → 5-item recall → feedback → next interval
```

Critical state variants: new/ready, locked, active, local draft, saved session, stale, passed, due, retry, review-bank unavailable, authored MDX unavailable. Navigation must never implicitly mutate learning state.

## Findings

| Priority | Screen/state | User-visible break | Resolution and acceptance |
| --- | --- | --- | --- |
| P0 | Lesson stage CTA after long content | Content changes while keyboard/scroll may remain below the new section | Next moves focus to the newly visible tabpanel; explicit tab key navigation retained; browser test must verify. |
| P0 | Evidence while inactive or locked | Bukti stage opens but has no form; users see a dead end | Explain eligibility in context with activation button or prerequisite links; passed state points to review. |
| P0 | Resume | Saved `lastAnchor` was passed from SSR but ignored if URL lacked a hash | Restore stage from saved anchor; explicit URL fragment overrides it. Do not invent a separate completion state. |
| P1 | Session form | Browser draft and server-save can be confused | Expose local draft status; successful server response remains authoritative. |
| P1 | Completion | Users cannot see how many criteria have real evidence until error | Display covered/total; on failed submit focus first missing criterion. |
| P1 | Lesson quiz | Quick feedback looks like a completion test | Explicitly say formative quiz is retryable and never marks complete. |
| P1 | Review | Submit disabled until all questions answered, no reason given | Display answered/total near submit; preserve server-only grade and remediation. |
| P1 | Curriculum search | First 16 results silently hide other matches | Show total count and accessible "load more"; preserve compact sidebar and keyboard controls. |
| P1 | Content availability | 159 units currently outline-only at this layer | Kept visible outline status from PR #21. Do not promise full explanations or fabricate materials. |
| P2 | Today | Manifest challenge description may be long/English, unlike UI Indonesian | Future content-editing task; change the authored curriculum source, not a lossy UI translation. |
| P2 | Quiz depth | Multiple-choice practice emphasizes recognition over open recall | Evaluate targeted free-recall prompt in course generator after real learner observation; no new scoring storage now. |
| P2 | Search scale | Hundreds of items across modules | Do not add a second tree or infinite sidebar; measure real query/scroll patterns first. |

## Acceptance matrix

| Variant | Expected |
| --- | --- |
| Ready, inactive | Can learn and practice; Bukti visibly offers Activate, never an empty panel |
| Locked | Can browse; Bukti shows missing prerequisite links; no completion mutation |
| Active | Session form appears; local draft status and covered criteria count visible |
| Draft restored | Says draft is local and not yet a server session |
| Missing criteria | Submission warns and focuses first missing textarea |
| Passed | Bukti reflects completion and directs toward review status |
| Authored | Stage content includes practice/quiz; quiz does not persist completion |
| Outline-only | Honest manual-practice notice; no fake grader |
| Due review | Answered count, disabled submit until all answers; grading on server |
| Many search matches | All matches accessible incrementally, with count |
| 320/390/901/1440, dark, keyboard | No overflow, focus loss, or duplicate main; sidebar/drawer preserved |

## Explicit non-goals

No gamification/streaks, timer enforcement, weekly planner, extra data models, automated assessment claims, second explorer or new component architecture. Client-only draft data is not a safe backup or cross-device sync. Score never substitutes for evidence.
