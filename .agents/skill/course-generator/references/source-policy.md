# Source Policy

Research exists to make the curriculum accurate, not larger.

## Order of operations

1. Read the curriculum-provided source.
2. Find primary sources for the exact scope.
3. Add a secondary authoritative source only when it materially improves explanation.
4. Stop researching when every required concept and caveat is supported.

## Authority tiers

### Tier 0 — curated curriculum source
Always inspect it. It may be official documentation, a standard, a maintainer resource, a university course, or a deliberately selected authoritative explainer.

### Tier 1 — primary / official
Prefer these for factual claims:

- official language/framework/database documentation;
- standards and RFCs;
- official specifications;
- original project documentation;
- original papers where appropriate.

### Tier 2 — strong authoritative teaching source
Use when primary documentation is too reference-oriented:

- university systems/database courses;
- maintainer-authored engineering material;
- canonical books/resources already selected by the curriculum.

### Tier 3 — supplemental
Community posts, forum answers, videos, and tutorials. Use only to discover terminology or examples; do not make them the sole factual basis when higher-tier sources exist.

## Source pack format

For each used source keep:

```yaml
title: PostgreSQL 18 — Tutorial
url: https://www.postgresql.org/docs/18/tutorial.html
tier: 0
supports:
  - relational tables
  - query basics
  - data types
notes:
  - reference for PostgreSQL-specific behavior
```

## Research constraints

- Prefer 2-5 strong sources over a large bibliography.
- Record exact URLs, not search-result URLs.
- Do not copy large passages; synthesize.
- When two authoritative sources disagree, surface the conflict instead of blending them.
- Distinguish universal concept from implementation-specific behavior.
- For version-sensitive technology, record the version used.
