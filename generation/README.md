# Generation records

Simpan `<ITEM-ID>.json` di sini bersama lesson unit yang sesuai. Lesson MDX hanya berlaku untuk item `kind: "unit"`; checkpoint dan integration memakai workspace masing-masing.

Format metadata scaffold:

```json
{
  "itemId": "SQL-001",
  "fingerprint": "sha256:<hasil scripts/fingerprint.ts>",
  "sources": [{ "title": "Judul sumber resmi", "url": "https://example.com/documentation" }],
  "coverage": [
    {
      "criterionId": "criterion-1",
      "taughtAt": "konsep",
      "assessedAt": "latihan",
      "evidenceExpected": "Hasil latihan dan penjelasan"
    }
  ],
  "validator": { "passed": true }
}
```

`taskId` pada metadata lama masih diterima sementara sebagai compatibility alias, tetapi record baru memakai `itemId`.

Coverage harus mencakup seluruh Definition of Done dan criterion `challenge` untuk unit. Fingerprint berasal langsung dari `curriculum/manifest.v2.json`:

```sh
pnpm exec tsx scripts/fingerprint.ts SQL-001
```

Frontmatter MDX masih memakai field `taskId` selama content collection compatibility window; nilainya adalah Item ID yang sama. Tidak ada generator yang dijalankan dari browser.
