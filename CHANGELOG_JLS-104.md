# CHANGELOG JLS-104

## Added

- Added choice-question AI provider factory for Practice explanations.
- Added OpenAI-backed choice explanation provider with Mock fallback.
- Added Settings action: 初始化學習進度.
- Added learning progress reset service that removes progress/history keys only.
- Added tests for OpenAI vs Mock choice provider selection and progress reset preservation rules.

## Changed

- Practice choice explanations now use `createChoiceAIProvider()` instead of directly constructing Mock provider.
- Settings now includes a confirmed reset flow for learning progress.
- Provider status remains visible in both choice explanations and essay answer analysis.

## Fixed

- Ensured initialization removes learning records, profile, active session, and last practice session without deleting imported question bank or user settings.
- Preserved Knowledge collapsible Learning Theme cards and Library CSV template behavior from the previous release.

## Known Issues

- Choice OpenAI generation depends on `VITE_OPENAI_API_KEY`; without it, the UI correctly shows `Mock 分析`.
