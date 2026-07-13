# ADR-012: Today UX Polish

## Status

Accepted

## Context

Sprint 5 introduced Today as the default learning workspace with four cards: Focus, Progress, Reminder, and Recommendation. Product review found that Reminder and Recommendation overlapped because both pointed to a next learning action.

## Decision

Today now uses three major cards: Today Focus, Learning Journey, and Today Recommendation. TodayReminder is removed from the Today view model and UI. TodayProgress is renamed to LearningJourney to better reflect that learning is not always linear progress.

## Consequences

Today is calmer and more intentional. The page avoids duplicate next-action messaging and keeps the learner focused on one decision: start the recommended learning step.
