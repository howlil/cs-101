# Review banks

Review bank adalah artifact assessment terstruktur yang dipakai server untuk grading recall.

Satu curriculum item memakai satu file `<ITEM-ID>.json`:

```json
{
  "itemId": "JAV-001",
  "version": "sha256-or-generator-version",
  "curriculumFingerprint": "sha256:<fingerprint item>",
  "questions": [
    {
      "id": "q1",
      "prompt": "Pertanyaan recall",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Alasan jawaban.",
      "criterionIds": ["criterion-..."]
    }
  ]
}
```

Aturan:

- tepat 5 pertanyaan;
- answer index harus valid;
- pertanyaan harus memetakan recall ke criterion/challenge, bukan trivia;
- `curriculumFingerprint` harus sama dengan item aktif;
- grading dilakukan server-side;
- reveal sebelum submit membuat attempt `assisted`, sehingga tidak dapat lulus walaupun score 5/5.

Bank belum dibuat otomatis pada P5. Generator/context pipeline P6 yang akan menghasilkan dan memvalidasinya.
