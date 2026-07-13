# ADR-011: TodayEngine for Daily Learning

## Status

Accepted

## Context

Today combines Questions, LearningRecords, PracticeSessions, KnowledgeNodes, Insights, and Recommendations. Putting that logic in the page would make Today hard to test and easy to clutter.

## Decision

Create `todayEngine.ts` to own Today focus, learning journey, recommendation, daily motto, and view model generation.

## Consequences

TodayPage stays focused on loading and rendering. Today logic is testable with Vitest and can evolve without changing the UI components.
