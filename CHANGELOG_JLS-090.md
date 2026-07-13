# CHANGELOG JLS-090

## Added

- Added Adaptive Learning `LearningRecord` model fields for learning theme and knowledge node state.
- Added `JLS_LEARNING_RECORDS` storage key.
- Added `learningRecordService` with get, save, upsert, find, and stable ID helper.
- Added unit tests for record ID creation, upsert behavior, lookup, and StorageService-only persistence.

## Changed

- Existing question-level learning records now include safe default values for the new Adaptive Learning fields.

## Known Issues

- Answer Analysis does not write back to LearningRecord yet.
- Today, Knowledge, Practice, and UI views do not consume the new LearningRecord service yet.
