import { describe, expect, it } from 'vitest';
import { OpenAIProvider } from './OpenAIProvider';
import type { KnowledgeGapInput } from '../../types/KnowledgeGapInput';

describe('OpenAIProvider', () => {
  it('compiles and returns AnswerAnalysisResult from structured JSON', async () => {
    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              score: 20,
              maxScore: 25,
              rating: 4,
              mastered: ['形成性評量'],
              suggestedAdditions: ['即時回饋'],
              knowledgeCoverageRate: 50,
              summary: '答案涵蓋部分重點。',
              referenceAnswer: '參考答案',
              provider: 'openai',
              createdAt: '2026-07-07T00:00:00.000Z',
            }),
            usage: {
              input_tokens: 10,
              output_tokens: 20,
              total_tokens: 30,
            },
          }),
          { status: 200 },
        ),
    });

    const result = await provider.analyzeEssay(createInput());

    expect(result).toEqual(
      expect.objectContaining({
        questionId: 'EA001',
        score: 20,
        maxScore: 25,
        rating: 4,
        mastered: ['形成性評量'],
        suggestedAdditions: ['即時回饋'],
        knowledgeCoverageRate: 50,
        provider: 'openai',
      }),
    );
  });

  it('falls back to Mock provider when API request fails', async () => {
    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      fetchFn: async () => new Response('server error', { status: 500 }),
    });

    const result = await provider.analyzeEssay(createInput());

    expect(result.provider).toBe('mock');
    expect(result.summary).toBe('OpenAI 分析失敗，已改用 Mock 分析。');
    expect(result.mastered).toEqual(['形成性評量']);
  });

  it('falls back to Mock provider when API key is missing', async () => {
    const provider = new OpenAIProvider({ apiKey: '' });
    const result = await provider.analyzeEssay(createInput());

    expect(result.provider).toBe('mock');
  });
});

function createInput(): KnowledgeGapInput {
  return {
    questionId: 'EA001',
    questionText: '請說明形成性評量。',
    learningTheme: '教學評量',
    knowledgeNode: '形成性評量',
    userAnswer: '形成性評量可以掌握學習狀態。',
    referenceAnswer: '形成性評量用於掌握學習狀態。',
    rubric: ['形成性評量', '即時回饋'],
    maxScore: 25,
  };
}
