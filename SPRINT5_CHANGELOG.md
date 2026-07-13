# Sprint 5 Changelog - Today

Version: v0.5.0

## Added

- Added Today domain types and `TodayViewModel`.
- Added `todayEngine` for Today focus, learning journey, recommendation, daily motto, and learning commit generation.
- Added fixed daily mottos that rotate by date.
- Added TodayPage as the default landing page.
- Added bottom navigation with Today, Practice, and Knowledge.
- Added TodayFocusCard, LearningJourneyCard, and TodayRecommendationCard.
- Added Today practice start flow that reuses existing PracticePage.
- Added Today style guide at `docs/ui/TODAY_PAGE.md`.
- Added ADR-010 and ADR-011.
- Added TodayEngine Vitest coverage.

## Changed

- Updated `/` to render TodayPage.
- Moved previous HomePage to `/home`.
- Updated PracticePage to accept focused `questionIds` from Today while preserving random practice and knowledge-node practice.

## Fixed

- No Sprint 5 regression fixes were required after final checks.

## Known Issues

- Today uses local data only and does not sync across devices.
- Today journey is based on available local PracticeSession data.
- Daily motto is fixed locally and is not user-configurable yet.

## Out of Scope

- Real AI API.
- Essay questions or essay scoring.
- Login, backend, database, or cloud sync.
- Push notifications.
- Leaderboard, badges, gamification.
- Full analytics dashboard.
- Knowledge graph visualization.
