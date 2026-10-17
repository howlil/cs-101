# Lesson Quality Gate

A generated course is accepted only if all critical checks pass.

## 1. Curriculum fidelity — required

- Correct Task ID and topic.
- Every Pareto-scope item is taught.
- Every original exit criterion has at least one teaching section and one assessment/evidence path.
- Original challenge intent is preserved.
- Project requirements are not weakened.
- Direct prerequisites are linked, not re-taught in full.

## 2. Mental-model quality — required

The lesson states one central model that helps the learner predict behavior.

Good:

`SQL query -> relational operations -> result relation; ordering exists only when explicitly requested.`

Weak:

`SQL is a language used to talk to databases.`

## 3. Mechanism quality — required

For every concept that affects debugging/design, explain the mechanism or relationship behind it.

Prefer:

- data/state flow;
- dependency arrows;
- invariants;
- execution traces;
- failure transitions;
- before/after comparison.

## 4. Assessment alignment — required

- No trivia-only questions.
- Quiz exercises reasoning used by the challenge.
- Wrong-answer explanations repair a specific misconception.
- Challenge has observable acceptance criteria.

## 5. Source quality — required

- Curriculum source was inspected.
- Primary/official sources were preferred for factual claims.
- Version-sensitive behavior names the relevant version.
- Source list contains direct URLs.
- No unsupported strong claims remain.

## 6. Low-friction start and recovery — required

- The first action is concrete and does not require a study-plan form.
- Common wrong predictions receive causal repair, not merely a correct-answer badge.
- Expected observations and a useful fallback are explicit.
- Independent transfer uses different input or a different failure mode.
- A resume cue explains what to do after interruption, without persisted learner state.
- Timers, streaks, and compulsory reflection are not required.

## 7. Cognitive-load quality — required

- Main payoff appears before background.
- New concepts are introduced in dependency order.
- No duplicated explanation across prose/table/diagram.
- Related-but-noncritical material is deferred.
- Page supports progressive disclosure for answers/deep dives without requiring a learner account or progress tracking.

## 8. Technical artifact quality — required

- Frontmatter passes schema.
- MDX builds successfully.
- Code/query examples are syntactically valid or explicitly pseudocode.
- Internal Task ID links resolve.
- Generation metadata exists.

## Coverage matrix

Before accepting, produce a matrix internally:

```text
Exit criterion → taught at → assessed at → evidence expected → PASS/FAIL
```

Any FAIL blocks publishing as a valid generated lesson. Schema validation cannot prove pedagogical quality or technical execution; review those separately.
