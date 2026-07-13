# CHANGELOG v1.0 RC

## Added

- Added CSV import support in Library with QuestionBankValidator validation.
- Added imported question-bank storage through StorageService.
- Added CSV template export as `JLS_question_template.csv`.
- Added Practice question type switching: 全部, 選擇題, 非選題.
- Added official non-choice Practice flow with answer textarea, submit action, KnowledgeGapEngine analysis, and AnswerAnalysisPanel display.
- Added Practice empty state for missing matching questions.
- Added Learning Coach UI test coverage.

## Changed

- Library is now focused on learning resource management only.
- Removed the non-choice test interface from Library.
- Practice is now the formal entry point for both choice and non-choice questions.
- `loadQuestions()` now prefers an imported CSV question bank and falls back to `public/questions.csv`.

## Known Issues

- Choice-question Learning Coach still uses the mock provider.
- Non-choice analysis follows the existing KnowledgeGapEngine and AIProvider behavior.
- Importing a CSV updates Today, Practice, and Knowledge when those screens reload their question data.
