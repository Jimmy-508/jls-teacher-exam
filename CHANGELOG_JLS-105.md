# CHANGELOG JLS-105

## Added

- Added a collapsed Knowledge section wrapper: `學習主題列表（N）`.
- Added File System Access API export flow for CSV template saving.
- Added browser fallback download when `showSaveFilePicker()` is unavailable.
- Added OpenAI choice provider tests for concrete option analysis output and prompt requirements.
- Added tests ensuring Mock choice provider does not generate fake AI long-form explanations.

## Changed

- Knowledge now keeps the summary metrics visible and collapses the entire Learning Theme list by default.
- CSV template export now lets supported browsers choose save location and filename.
- Choice Mock provider now only displays the OpenAI-not-enabled notice.
- `ExplanationPanel` shows only the Mock fallback notice when provider is Mock.
- Choice OpenAI prompt now requires question-specific `questionKeyPoint`, A/B/C/D option analysis, learning feedback, and extended learning.

## Fixed

- Removed generic fake-AI choice explanation phrases from Mock output.
- Prevented Mock fallback from looking like real AI analysis.

## Known Issues

- Browsers without File System Access API still use the standard download fallback.
