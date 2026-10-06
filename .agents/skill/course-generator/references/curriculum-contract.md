# Curriculum Contract

The curriculum is the learning specification. Generated content may explain it, but must not redefine it.

## Canonical identity

Use `Task ID` as the stable identity everywhere. Titles are display labels and may change.

Examples:

- `JAV-001`
- `SQL-001`
- `JAV-P01`

## Canonical fields

A normal material row can contain:

- Phase
- Skill / Topic
- Market Expectation
- Learn Now (Pareto 20%)
- Training KPI / Exit Criteria
- Duration
- Status
- Micro Challenge
- Retrospective
- Project Checkpoint
- Problem Statement
- Project Requirements
- Learning Source
- Source URL
- Cross-Module Reference
- Task ID

The workflow sheets may additionally provide active task, prerequisites, previous evidence, review state, and queue ordering.

## Precedence

When fields conflict:

1. Task ID + current curriculum row
2. Explicit project requirements / exit criteria
3. Pareto scope
4. Micro challenge
5. Cross-module references
6. Generated content

Generated content never overrides levels 1-5.

## On-demand rule

Read and generate only the smallest curriculum slice needed for the requested Task ID:

`target + direct prerequisites + active checkpoint + relevant cross-reference`

Do not load the full curriculum into the generation prompt unless a curriculum-wide operation is requested.

## Staleness

Store a `curriculum_fingerprint` in generation metadata. If the source fields for a Task ID change, mark the generated lesson stale and regenerate that lesson on demand.
