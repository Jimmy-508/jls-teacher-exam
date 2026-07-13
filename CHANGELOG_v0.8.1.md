# CHANGELOG v0.8.1

## Added

- Added OpenAI configuration in `src/config/openai.ts`.
- Added environment variable support for `VITE_OPENAI_API_KEY`.
- Implemented `OpenAIProvider.analyzeEssay()`.
- Added structured JSON output handling for `AnswerAnalysisResult`.
- Added automatic fallback to `MockAIProvider`.
- Added OpenAI provider architecture documentation.

## Changed

- `AIProviderFactory` now automatically chooses OpenAI when an API key exists and Mock when it does not.

## Fixed

- OpenAI request failures no longer interrupt the answer analysis flow.

## Known Issues

- Prompt quality and scoring improvements are out of scope for v0.8.1.
- Gemini and Claude providers remain future placeholders.

