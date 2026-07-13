# CHANGELOG v0.8.x Final Patch

## Changed

- Library subtitle changed from `管理你的學習資產` to `學習資源管理`.
- MockAIProvider now treats answers identical or highly similar to the reference answer as complete answers before rubric keyword matching.

## Added

- Added `匯出 CSV 範本` action in Library.
- Added CSV template download as `JLS_question_template.csv` with the same headers as `public/questions.csv`.
- Added analysis provider status messaging for OpenAI / Mock analysis state.

## Fixed

- Fixed the issue where pasting the displayed reference answer back into the answer field could fail to score 100%.
- Reference-answer matches now return full score, 5-star rating, 100% knowledge coverage, and no suggested additions.

## Known Issues

- The CSV template currently exports headers only.
- `npm` is not available in the current shell environment; validation is run with the bundled pnpm runtime.
