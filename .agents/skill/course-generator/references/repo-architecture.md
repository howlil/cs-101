# CS-101 Content Library Architecture

```text
curriculum/manifest.v2.json
  ├─ src/domain/curriculum-v2/ → typed tracks/modules/units/projects/relations
  ├─ src/domain/generation/ → source and lesson coverage validation
  ├─ generation/staging/ → prepared authoring context and draft
  ├─ generation/<ID>.json → validated provenance
  ├─ review-banks/<ID>.json → static question set
  └─ src/content/lessons/<ID>.mdx → authored lesson
        ↓ Astro getCollection + render
src/pages/index.astro
        ↓
src/components/library/ContentLibrary.astro
        ↓
src/layouts/AppLayout.astro + AppSidebar (domain select, module accordion)
```

UI boundaries:
- One content page at root. Old URLs only redirect.
- Server may parse the manifest and render MDX; it does **not** read/write learner state.
- Only ephemeral React state for quiz feedback, navigation, search, theme, and mobile sidebar.
- No database binding, migrations, user identity, active task, progress, evidence, or review engine.

The generator stages sources/spec/content, validates coverage, and then promotes hashed artifacts. Never include global navigation or learner tracking inside an authored MDX lesson.
