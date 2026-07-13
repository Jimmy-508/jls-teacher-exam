# ADR-006: Insight Engine Separated From AI

## Status

Accepted

## Context

JTEP treats learning analysis as a core domain capability. Insight is not the same as AI-generated explanation.

## Decision

InsightEngine owns knowledge node grouping, weaknesses, strengths, insights, and recommendations. It must not call AIProvider or StorageService.

## Consequences

Insights remain deterministic and testable. AI explanations can evolve independently without modifying learning state or recommendation logic.
