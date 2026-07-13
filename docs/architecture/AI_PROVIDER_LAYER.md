# AI Provider Layer

Version: v0.7.0

## Why Provider Pattern

KnowledgeGapEngine should coordinate answer analysis, but it should not know how a model performs the analysis. The provider pattern keeps model-specific behavior behind one interface:

```ts
interface AIProvider {
  analyzeEssay(input: KnowledgeGapInput): Promise<AnswerAnalysisResult>;
}
```

This makes the engine stable while providers evolve independently.

## Architecture

```text
KnowledgeGapEngine
  -> AIProvider
    -> MockAIProvider
    -> OpenAIProvider
    -> GeminiProvider (future)
    -> ClaudeProvider (future)
```

## Current Provider

`MockAIProvider` is deterministic. It compares the user answer with rubric keywords and returns structured `AnswerAnalysisResult`.

## OpenAI Provider

`OpenAIProvider` exists as a skeleton only. It does not call any external API in v0.7.0.

## Factory

`createProvider(type)` centralizes provider creation. The default provider is configured in `src/config/ai.ts`.

To switch providers in a future sprint, update configuration or factory behavior without modifying `KnowledgeGapEngine`.

## Rule

KnowledgeGapEngine must not contain model implementation, keyword matching logic, prompt logic, network calls, or provider-specific behavior.

