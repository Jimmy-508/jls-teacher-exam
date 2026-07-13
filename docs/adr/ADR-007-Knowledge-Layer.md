# ADR-007: Knowledge Layer

## Status

Accepted

## Context

JTEP needs to evolve from question practice into learning analysis. Knowledge nodes come from `Question.knowledgeNode`, while Question remains immutable and CSV-backed.

## Decision

Add a Knowledge Layer with `KnowledgeNode`, `KnowledgeGraph`, and `knowledgeService`. Knowledge data is derived from Questions and LearningRecords and references questions by ID only.

## Consequences

Knowledge views and weak-node detection can be built without duplicating full Question content. The graph remains a lightweight derived structure and can later be visualized by a graph library if needed.
