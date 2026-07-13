# OpenAI Provider

Version: v0.8.1

## Architecture

```text
KnowledgeGapEngine
  -> AIProvider
    -> OpenAIProvider
      -> OpenAI Responses API
```

`KnowledgeGapEngine` does not know how OpenAI works. It only calls `provider.analyzeEssay(input)` and receives `AnswerAnalysisResult`.

## Environment Variables

Supported Vite environment variables:

```text
VITE_OPENAI_API_KEY
VITE_OPENAI_MODEL
VITE_OPENAI_TEMPERATURE
VITE_OPENAI_MAX_TOKENS
```

Only `VITE_OPENAI_API_KEY` is required to enable OpenAI. API keys must never be hardcoded.

## Default Configuration

The default model is configured in `src/config/openai.ts`.

The provider factory chooses:

```text
VITE_OPENAI_API_KEY exists -> OpenAIProvider
VITE_OPENAI_API_KEY missing -> MockAIProvider
```

## Structured Output

OpenAIProvider requests JSON matching `AnswerAnalysisResult`. It does not return Markdown or free text to the UI.

Required fields:

- `score`
- `maxScore`
- `rating`
- `mastered`
- `suggestedAdditions`
- `knowledgeCoverageRate`
- `summary`
- `referenceAnswer`
- `provider`
- `createdAt`

## Fallback

If OpenAI request fails, the provider automatically falls back to `MockAIProvider`. The user flow should not be interrupted.

## Logging

Development mode logs:

- provider used
- response time
- token usage when available

Production mode does not log provider details.

## Future Expansion

Gemini and Claude providers can implement the same `AIProvider` interface without modifying `KnowledgeGapEngine` or `AnswerAnalysisPanel`.

