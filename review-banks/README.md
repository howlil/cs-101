# Practice question banks (legacy directory name)

Each `<ITEM-ID>.json` is a **static collection of five formative questions**, authored from `lesson-spec.json` and verified by `pnpm validate:reviews`. The directory is named `review-banks` for generator compatibility, **not** for scheduling reviews.

Questions must:
- map back to the curriculum item and its fingerprint;
- have valid answer indices, useful explanations, and explicit criterion coverage;
- test mechanisms, prediction, debugging, or design trade-offs instead of memorization.

The website does not persist answers. Self-check quiz feedback runs entirely in the browser. There is no server grading, recall history, spaced repetition, or account system. This content can be reused in future authored MDX; it is not an authoritative learner assessment.
