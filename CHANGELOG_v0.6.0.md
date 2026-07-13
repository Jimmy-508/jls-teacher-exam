# CHANGELOG v0.6.0

## Added

- Added `AnswerAnalysisResult`.
- Added `KnowledgeGapInput`.
- Added deterministic `KnowledgeGapEngine`.
- Added `RubricService`.
- Added `public/questions_answer_analysis_test.csv`.
- Added `docs/testing/ANSWER_ANALYSIS_TEST_CASES.md`.
- Added `src/mocks/answerAnalysisMock.ts`.

## Changed

- `AnswerAnalysisPanel` now accepts `AnswerAnalysisResult`.
- `MockAIProvider.evaluateEssay()` now returns Knowledge Gap Engine output.
- `AIProvider.evaluateEssay()` now uses Sprint 6 essay analysis input and output.

## Fixed

- Kept Answer Analysis UI terminology aligned with official terms.
- Kept reference answer collapsed by default.

## Known Issues

- Sprint 6 does not call real AI APIs.
- Sprint 6 does not implement a full essay practice workflow.
- LearningRecord updates from Answer Analysis are exposed as a prepared hook only.

