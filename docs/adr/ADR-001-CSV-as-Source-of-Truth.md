# ADR-001: CSV as Source of Truth

## Status

Accepted

## Context

Sprint 1 defines `public/questions.csv` as the source of question data. Question rows must remain compatible with the required Chinese CSV headers.

## Decision

JTEP will treat `public/questions.csv` as the source of truth for Question data. The app parses CSV into immutable Question objects and does not persist modified Question copies.

## Consequences

Question updates happen by replacing the CSV file. LearningRecord, PracticeSession, Insight, and AI explanation data must reference questions by `questionId` instead of duplicating full question content.
