# CHANGELOG JLS-099 Final v2

## Added

- Added `getActiveQuestionBank()` so Today, Practice, Knowledge, and Library can share the same active question-bank source.
- Added reset support for imported question banks.
- Added `public/test_question_bank_3_questions.csv` for import smoke testing.
- Added Practice question count controls: 5, 10, 20, 25.
- Added tests for active question bank loading, reset, Practice type/count controls, and LearningTheme taxonomy normalization.

## Changed

- `loadQuestions()` now reads through the active question bank instead of reading `questions.csv` directly.
- Library now shows whether the user is using the default or imported question bank.
- Practice page now has a consistent `Practice` page header and controls for type/count.
- Knowledge and Library no longer show back-to-Today links in the page header.
- LearningTheme grouping avoids using subject/category labels as card titles when CSV mapping is misaligned.

## Fixed

- Fixed imported question bank not being the single shared source for app question loading.
- Fixed Practice being limited to a hard-coded 5-question draw.
- Fixed Knowledge card titles that could display subject/category labels instead of learning taxonomy labels.

## Known Issues

- Existing pages pick up an imported or reset question bank when they reload their data.
- Imported CSV validation still follows the existing QuestionBankValidator rules.
