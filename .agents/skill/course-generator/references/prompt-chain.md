# Prompt Chain

Use staged generation so each stage has a narrow responsibility and a testable output.

## Chain

```text
TARGET
  ↓
[1] Context Resolver
  ↓ curriculum_packet.json
[2] Source Researcher
  ↓ source_pack.json
[3] Lesson Architect
  ↓ lesson_spec.json
[4] Course Writer
  ↓ <TASK-ID>.mdx
[5] Assessment Builder
  ↓ quiz/challenge sections or structured data
[6] Validator
  ↓ validation_report.json
[7] Persist
```

Do not pass raw browser/search dumps downstream. Pass compact structured outputs.

## 1. Context Resolver

Goal: answer “what exactly must this learner master now?”

Output:

```json
{
  "taskId": "SQL-001",
  "track": "db&sql",
  "topic": "Relational model + PostgreSQL fundamentals",
  "paretoScope": [],
  "exitCriteria": [],
  "challenge": "...",
  "prerequisites": [],
  "crossReferences": [],
  "project": null
}
```

Failure condition: target cannot be uniquely resolved.

## 2. Source Researcher

Goal: support the curriculum packet with authoritative evidence.

Questions:

- What is implementation-independent?
- What is specific to the named technology/version?
- What misconception would cause the learner to fail the challenge?
- What mechanism must be understood rather than memorized?

Output: 2-5 source records + concept-to-source map.

## 3. Lesson Architect

Goal: create the smallest learning graph that can satisfy all exit criteria.

Build:

```text
payoff
  ↓
central mental model
  ↓
core relationships/mechanisms
  ↓
prediction / worked example
  ↓
learner practice
  ↓
challenge
  ↓
exit-criteria proof
```

Output must include an `exitCriteriaCoverage` map before prose is generated.

## 4. Course Writer

Goal: teach the lesson in the planned order.

Default section order:

1. Brief / why this matters
2. What you must be able to do
3. Mental model
4. Core concepts and mechanisms
5. Worked example / trace
6. Common wrong models
7. Guided practice
8. Quiz
9. Micro challenge
10. Project bridge (only if applicable)
11. Exit checklist + evidence
12. Sources

The writer may compress or merge sections when the lesson is small.

## 5. Assessment Builder

Map questions to exit criteria. Avoid trivia.

Use a mix of:

- prediction;
- explain-why;
- debugging;
- design choice;
- code/query output;
- state-transition reasoning.

Provide answers in a collapsible/reveal component where the course UI supports it.

## 6. Validator

Check:

- curriculum coverage;
- source coverage;
- factual consistency;
- assessment alignment;
- challenge fidelity;
- MDX/frontmatter schema;
- internal links/prerequisites;
- build success.

The validator can request a targeted repair from stages 3-5. Do not regenerate unrelated content.

## 7. Persist

Store the generated lesson and metadata. Never change curriculum state to “complete” just because the artifact exists.
