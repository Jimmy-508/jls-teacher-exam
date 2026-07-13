# ADR-013: LearningTheme Layer

## Status

Accepted

## Context

KnowledgeNode is a fine-grained diagnostic concept. The current CSV can create singleton KnowledgeNodes, which makes Today Focus too narrow.

## Decision

Introduce LearningTheme as a broader learning unit above KnowledgeNode. Map CSV `類別` to `Question.learningTheme` while keeping legacy `Question.group`.

## Consequences

Today Focus can select up to five questions from a LearningTheme instead of stopping at a singleton KnowledgeNode. KnowledgeNode remains available for diagnosis, explanation, and familiarity tracking. The app gains a clearer domain hierarchy without changing the CSV schema.
