# Changelog v0.5.1 - Today UX Polish

## Added

- Added `LearningJourney` and `LearningJourneyCard`.
- Added ADR-012 for the Today UX polish decision.

## Changed

- Today now shows three major cards: 今日焦點, 今日旅程, 今日建議.
- Renamed TodayProgress to LearningJourney in the Today model and engine.
- Simplified TodayEngine to provide focus, learning journey, recommendation, daily motto, and view model generation.
- Polished Today spacing, card rhythm, and wording.
- Updated Today tests for the three-card structure.

## Fixed

- Removed duplicate Reminder messaging from Today.
- Rewrote Today-facing text to avoid garbled UI strings.

## Known Issues

- Today still uses local browser data only.
- Learning Journey is derived from the available local PracticeSession history.

## Out of Scope

- AI, essay questions, analytics dashboard, cloud sync, login, backend, notifications, badges, leaderboard, and gamification.
