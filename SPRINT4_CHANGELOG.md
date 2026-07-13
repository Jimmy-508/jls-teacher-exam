# Sprint 4 Changelog - Knowledge

Version: v0.4.0

## Added

- Added `KnowledgeGraph` and `KnowledgeEdge` models.
- Added `knowledgeService` for KnowledgeNode grouping, graph derivation, weak knowledge detection, question filtering, wrong-rate calculation, and node status.
- Added Knowledge Overview page at `/knowledge`.
- Added `KnowledgeNodeCard` for node detail display and node-based practice entry.
- Added knowledge-based practice through route state into PracticePage.
- Added Knowledge Insight support in InsightEngine.
- Added GitHub Actions CI workflow.
- Added Vitest and core tests for QuestionEngine, LearningEngine, and KnowledgeService.
- Added ADR-007, ADR-008, and ADR-009.

## Changed

- Updated package version to `0.4.0`.
- Updated HomePage with a Knowledge Overview entry.
- Updated PracticePage so normal practice still resumes, while knowledge-based practice starts a fresh node-specific session.

## Fixed

- Rewrote garbled user-facing HomePage and PracticePage strings while preserving Sprint 1 to Sprint 3 behavior.

## Known Issues

- KnowledgeGraph is derived but not rendered as an interactive graph.
- Wrong-rate calculation is intentionally simple for Sprint 4.
- CI currently runs install and build only, matching Sprint 4 requirements.

## Out of Scope

- D3.js or Cytoscape graph visualization.
- Real AI API integration.
- Essay questions.
- Statistics dashboard.
- Login, backend, database, or cloud sync.
