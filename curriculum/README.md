# Curriculum source

`manifest.v2.json` adalah snapshot runtime/build yang sudah dinormalisasi. Spreadsheet asli tidak disimpan di repository karena workbook juga dapat memuat state/sesi belajar pribadi.

```sh
pnpm import:curriculum -- /path/to/kurikulum.xlsx --dry-run # compare only, no writes
# Review added/removed/changed IDs and workbook SHA before applying:
pnpm import:curriculum -- /path/to/kurikulum.xlsx
pnpm validate:curriculum
pnpm test
```

Importer hanya mengambil struktur curriculum: track, module, unit, checkpoint, integration, prerequisite, scope, challenge, exit criteria, source, project requirement, dan cross-module reference. Kolom status, menit, review result, dan state learner dari workbook tidak menjadi source of truth curriculum.

Cross-module reference hanya dibuat menjadi relation jika target dapat di-resolve secara exact. Referensi ambigu masuk `import-report.json`; importer tidak menebak dependency.

**Migration policy:** Do not overwrite the active manifest when a workbook has a different track/item count or source hash without reviewing the dry-run diff. An item ID and its fingerprint are referenced by authored lesson MDX and generation metadata. Retain stable IDs for unchanged competencies, re-author changed lessons, and never infer ambiguous graph dependencies.
