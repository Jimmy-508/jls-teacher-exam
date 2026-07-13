# Sprint 3 Changelog - Insight

Version: v0.3.0

## Added

- Added KnowledgeNode, LearningInsight, Recommendation, and ChoiceExplanation domain models.
- Added `InsightEngine` with pure functions for knowledge node grouping, weakness detection, strength detection, insight generation, and recommendation generation.
- Added `AIProvider` interface and deterministic `MockAIProvider`.
- Added collapsed-by-default `ExplanationPanel` for choice question explanations.
- Added manual "查看解析" flow after answering a choice question.
- Added ADR documents under `docs/adr/`.

## Changed

- Updated PracticePage and QuestionCard to support manual explanation requests without changing the existing quiz flow.
- Kept Sprint 2 memory behavior intact: answers still update LearningRecord, PracticeSession, and LearningProfile immediately.

## Fixed

- No Sprint 3 regression fixes were required after implementation checks.

## Known Issues

- MockAIProvider explanations are deterministic templates, not real AI output.
- InsightEngine has no dedicated dashboard in Sprint 3; it provides models and pure generation functions only.
- Explanations are not persisted yet.

## Out of Scope

- Real OpenAI, Gemini, or Claude API integration.
- Essay scoring.
- Statistics dashboard.
- Login, backend, database, user account, or cloud sync.
