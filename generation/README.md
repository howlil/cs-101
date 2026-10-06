# Generation records

Simpan `<TASK-ID>.json` di sini bersama lesson yang sesuai. Format metadata scaffold:

```json
{
  "taskId": "SQL-001",
  "fingerprint": "sha256:<hasil scripts/fingerprint.ts>",
  "sources": [{ "title": "Judul sumber resmi", "url": "https://example.com/documentation" }],
  "coverage": [{ "criterionId": "criterion-1", "taughtAt": "konsep", "assessedAt": "latihan", "evidenceExpected": "Hasil latihan dan penjelasan" }],
  "validator": { "passed": true }
}
```

Contoh di atas adalah bentuk data, bukan record siap pakai. Coverage harus mencakup semua kriteria, ID `challenge`, dan project requirements. Tandai `passed` hanya setelah quality gate course-generator selesai. Validator otomatis memeriksa bentuk dan coverage ID; kebenaran sumber, isi, serta ketepatan anchor perlu direview.

Skill memakai beberapa nama field/template berbeda. Adaptasikan output ke schema scaffold: frontmatter memakai `taskId`, `title`, `description`, `curriculumFingerprint`; metadata memakai `fingerprint` dan array `coverage`. Import komponen harus relatif terhadap lokasi MDX; lihat `src/content/lessons/demo.mdx`. Tidak ada generator otomatis yang dijalankan dari browser.
