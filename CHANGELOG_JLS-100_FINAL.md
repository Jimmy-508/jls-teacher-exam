# CHANGELOG JLS-100 Final

## Added

- Added a visible CSV Validation Report with row, field, and error reason for failed imports.
- Added import success summary showing question count, Learning Theme count, Knowledge Node count, and synchronization status.

## Changed

- Removed the Today motto from the first screen so the page focuses on greeting, 今日焦點, and 開始今日學習.
- Collapsed Practice controls into 練習設定 with 題型 and 題數 options.
- Renamed Learning Coach UI copy to 細說分明.
- Simplified the choice explanation flow so one click opens 細說分明 directly.
- Aligned the CSV template export with the validator header standard.

## Fixed

- Fixed CSV import debugging by routing active question bank access through `getActiveQuestionBank()`.
- Fixed CSV validation so failed imports show all validator errors instead of a generic failure message.
- Fixed the exported CSV template so its header is the same source of truth used by validation.

## Known Issues

- Imported question banks update the shared active question bank immediately; already mounted pages may still need their own reload cycle before re-reading data.
