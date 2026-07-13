# CHANGELOG JLS-102 Final

## Added

- Added CSV file decoding helper that tries UTF-8 first and falls back to Big5 / CP950 when Chinese headers are unreadable.
- Added tests for the actual 25-column CSV schema.
- Added tests for Big5 / CP950 Chinese header parsing.
- Added tests confirming `row["題幹"]` is used correctly and does not produce false blank-stem errors.
- Added Learning Theme display mappings:
  - `測驗` / `教育測驗` -> `教育測驗與評量`
  - `課程` / `課程發展` -> `課程發展與設計`

## Changed

- Library import now reads CSV files through `readQuestionBankCsvFile()` instead of `file.text()`.
- CSV template export remains exactly aligned to the actual 25-column user schema.
- Validator now blocks only when `題幹` is truly empty after correct header parsing.
- Duplicate IDs and recoverable empty fields are warnings, not blocking errors.
- Unknown question type text now normalizes to essay without warning; blank question type still warns and falls back to essay.
- Practice question meta now displays the Learning Theme display name.

## Fixed

- Fixed Big5 / CP950 Excel CSV imports where Chinese headers could previously become mojibake.
- Fixed false `題幹` blank errors caused by encoding/header parsing mismatch.
- Fixed Knowledge and Library display so `測驗` and `課程` no longer appear as raw short labels.

## Known Issues

- CSV raw text is preserved in storage after import; display mapping is applied only at UI/summary/query time.
