# Curriculum source

`manifest.v2.json` adalah snapshot runtime/build yang sudah dinormalisasi. Spreadsheet asli tidak disimpan di repository karena workbook juga dapat memuat state/sesi belajar pribadi.

```sh
pnpm import:curriculum -- /path/to/kurikulum.xlsx
pnpm validate:curriculum
pnpm test
```

Importer hanya mengambil struktur curriculum: track, module, unit, checkpoint, integration, prerequisite, scope, challenge, exit criteria, source, project requirement, dan cross-module reference. Kolom status, menit, review result, dan state learner dari workbook tidak menjadi source of truth curriculum.

Cross-module reference hanya dibuat menjadi relation jika target dapat di-resolve secara exact. Referensi ambigu masuk `import-report.json`; importer tidak menebak dependency.
