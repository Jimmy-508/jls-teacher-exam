# CHANGELOG JLS-101 Final

## Added

- Added robust CSV header detection that can skip leading note rows before the real header.
- Added CSV header normalization for BOM, whitespace, and common English aliases.
- Added Learning Theme Display Dictionary with `getLearningThemeDisplayName()`.
- Added validation warning reporting alongside blocking errors.
- Added tests for parser robustness, question type normalization, warning-based validation, active question bank behavior, and Learning Theme display mapping.

## Changed

- CSV validation now treats recoverable data issues as warnings instead of blocking import.
- Missing IDs, years, subjects, question numbers, scores, Learning Themes, and Knowledge Nodes now use stable fallbacks.
- Question type values now normalize to the internal official types: `選擇題` and `非選題`.
- Library import success copy now includes warning count.
- Knowledge, Today-derived theme display, Practice theme filtering, and Library summaries now use Learning Theme display names.

## Fixed

- Fixed parser behavior when CSV files contain leading description rows before the header.
- Fixed empty CSV data rows so they are ignored before validation and import.
- Fixed imported question banks with non-template but recognizable headers so they can still parse.
- Fixed Learning Theme aliases so display names remain stable without mutating imported CSV data.

## Known Issues

- The Display Dictionary currently includes the first official aliases only and is intentionally small; future aliases should be added to `src/services/displayDictionary.ts`.
