---
name: course-generator
description: Generate one CS-101 lesson on demand from the curriculum source, research authoritative sources, and write a source-backed Astro/MDX course page with quizzes, challenges, project guidance, and exit-criteria validation. Use when generating, regenerating, or auditing a specific curriculum task such as SQL-001 or JAV-013; do not bulk-generate the curriculum unless explicitly requested.
---

# Course Generator

Generate **one learning unit at a time** from the CS-101 curriculum. Treat the curriculum as the specification and the generated lesson as a compiled artifact.

## Core mental model

`curriculum row -> source pack -> lesson spec -> MDX lesson -> validation -> persisted artifact`

- Curriculum = source of truth for scope, challenge, prerequisites, project checkpoint, and definition of done.
- Authoritative sources = factual dependencies used to explain the scope correctly.
- Lesson spec = compact intermediate representation passed between generation stages.
- Astro/MDX = presentation layer; Astro compiles the lesson to HTML.
- Exit criteria = executable acceptance tests for the lesson itself.

Never make the generated lesson become a second curriculum.

## Read these references

Before generating a lesson, read only what is needed:

- `references/curriculum-contract.md`
- `references/prompt-chain.md`
- `references/source-policy.md`
- `references/repo-architecture.md`
- `references/learning-workflow.md`
- `references/lesson-quality-gate.md`

Use `assets/lesson-template.mdx` as the output contract.

## Input resolution

Accept any of these targets:

1. Explicit Task ID, e.g. `SQL-001`, `JAV-013`.
2. Explicit topic name if it uniquely resolves to a Task ID.
3. `current`, `active`, or equivalent: resolve the active task from the curriculum/workflow source.

If a target can be resolved unambiguously, do not ask for confirmation.

## Workflow

1. **Resolve context**
   - Find the target Task ID.
   - Read the target row plus only its direct prerequisites, cross-module references, active project checkpoint, and previous lesson if needed for continuity.
   - Preserve the curriculum wording for challenge and exit criteria.

2. **Build a curriculum packet**
   Normalize only these fields:
   - task id
   - track/jalur
   - phase
   - topic
   - why/market expectation
   - Pareto scope (`Learn Now`)
   - exit criteria
   - micro challenge
   - project checkpoint/problem/requirements
   - curriculum source + URL
   - prerequisites
   - cross-module references

3. **Research sources**
   - Read the curriculum-provided source first.
   - Find primary/official sources for the exact Pareto scope.
   - Produce a compact source pack: source title, URL, authority tier, concepts supported, important caveats.
   - Do not continue with unsupported factual claims.

4. **Create the lesson spec**
   Build a compact plan before writing prose:
   - learner payoff
   - 3-7 learning outcomes derived from exit criteria
   - one central mental model
   - dependency/cause-effect graph
   - concepts in teaching order
   - one mechanism/example per important concept
   - misconception traps
   - practice sequence
   - quiz blueprint
   - challenge plan
   - project bridge if applicable
   - exit-criteria coverage map

5. **Generate the lesson**
   - Write MDX using `assets/lesson-template.mdx`.
   - Optimize for low cognitive load: payoff first, then mental model, then mechanisms, then practice.
   - Be detailed enough to pass the original exit criteria, but do not expand the syllabus with unrelated material.
   - Prefer diagrams, tables, code, traces, state transitions, and prediction exercises when they reduce prose.

6. **Generate assessment from the definition of done**
   - Every quiz item must test a learning outcome or known misconception.
   - Challenges must preserve the original challenge intent.
   - For prediction-heavy topics, require prediction before execution.
   - For coding topics, provide acceptance criteria and tests, not a full solution unless explicitly requested.
   - For project checkpoints, explain what to build, dependency order, observable evidence, and done conditions.

7. **Validate**
   Run the quality gate in `references/lesson-quality-gate.md`.
   A lesson is invalid if any original exit criterion is not taught and assessed.

8. **Persist**
   Write only the requested lesson and its generation metadata.
   Never generate the next lesson automatically.

## Writing rules

- Direct answer/payoff first.
- Use one strong mental model rather than many analogies.
- Explain relationships: dependency, cause-effect, hierarchy, state transition, invariants, failure modes.
- Pareto principle applies to teaching order, not to deleting requirements.
- Explain “what is behind it” when it changes reasoning or debugging ability.
- Avoid motivational filler and generic definitions that do not help solve the challenge.
- Use exact technical vocabulary, then explain it plainly.
- Code examples must be minimal, executable, and directly tied to the concept.
- No invented metrics, APIs, behavior, or requirements.

## Non-goals

Do not:

- bulk-generate all lessons by default;
- silently modify curriculum scope;
- generate standalone raw HTML files with duplicated layout/style;
- use blogs as the primary factual source when official/primary documentation exists;
- turn every cross-module reference into a deep dive;
- provide full project solutions when the learning goal is implementation practice;
- mark a lesson complete merely because content was generated.

## Completion report

After generation, report only:

- generated Task ID and path;
- primary sources used;
- exit-criteria coverage status;
- any unresolved source/curriculum conflict;
- the single next learner action.
