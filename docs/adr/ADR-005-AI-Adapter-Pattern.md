# ADR-005: AI Adapter Pattern

## Status

Accepted

## Context

Sprint 3 adds explanation architecture without real external AI APIs. Future providers may include OpenAI, Gemini, or Claude.

## Decision

AI capabilities are represented by an `AIProvider` interface. Sprint 3 ships `MockAIProvider` as a deterministic local implementation.

## Consequences

UI can request explanations through a stable interface. Future providers can replace the mock without changing learning data ownership or question models.
