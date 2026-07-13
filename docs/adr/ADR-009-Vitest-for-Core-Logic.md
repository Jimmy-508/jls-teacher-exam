# ADR-009: Vitest for Core Logic

## Status

Accepted

## Context

QuestionEngine, LearningEngine, InsightEngine, and KnowledgeService contain the most important non-UI logic.

## Decision

Use Vitest for fast unit tests around core services and engines.

## Consequences

Core logic can be validated without browser automation. The initial test suite covers question filtering, answer checking, familiarity updates, status calculation, knowledge node grouping, weak-node detection, and graph derivation.
