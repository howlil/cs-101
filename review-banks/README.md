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
- answer key dan explanation tidak dikirim ke browser sebelum submit;
- bank final diturunkan dari `lesson-spec.json` oleh `generation:validate`, bukan diedit manual;
- setiap curriculum criterion harus tercakup minimal satu review question.

P6 menghasilkan review bank sebagai derived artifact dari lesson spec yang sama dengan lesson, sehingga assessment tidak drift dari coverage lesson.
