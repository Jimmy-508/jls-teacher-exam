import { describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from './OpenAIProvider';
import type { Question } from '../../types/question';

describe('choice OpenAIProvider', () => {
  it('returns concrete ChoiceExplanation content from OpenAI response', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          questionKeyPoint: '本題考教育基本法中受教權與適性發展的關係。',
          optionAnalysis: {
            A: 'A ❌ 只強調升學競爭，與教育基本法保障學生學習權及適性發展的方向相反。',
            B: 'B ✅ 保障受教權並促進適性發展，符合教育基本法以學生為主體的核心。',
            C: 'C ❌ 單一標準忽略學生差異，違反適性發展的要求。',
            D: 'D ❌ 行政效率不能優先於學生權益，與教育基本法保障學生權利不符。',
          },
          learningFeedback: '你選 A 時，可能把升學結果誤當成教育目的；本題要辨認學生權利與適性發展。',
          extendedLearning: {
            relatedKnowledgeNodes: ['教育基本法', '受教權'],
            confusingConcepts: ['升學競爭 vs 適性發展'],
            relatedExamPoints: ['學生權利保障'],
            recommendedPracticeCount: 3,
          },
        }),
      }),
    })) as unknown as typeof fetch;
    const provider = new OpenAIProvider({ apiKey: 'test-api-key', fetchFn });

    const explanation = await provider.explainChoiceQuestion(createQuestion(), 'A');

    expect(explanation.provider).toBe('openai');
    expect(explanation.questionKeyPoint).toContain('受教權');
    expect(explanation.optionAnalysis.A).toContain('升學競爭');
    expect(explanation.optionAnalysis.B).toContain('適性發展');
    expect(explanation.learningFeedback).toContain('升學結果');
    expect(explanation.extendedLearning.relatedKnowledgeNodes).toContain('教育基本法');
  });

  it('sends prompt requirements for concrete analysis sections', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          questionKeyPoint: '題目關鍵',
          optionAnalysis: { A: 'A', B: 'B', C: 'C', D: 'D' },
          learningFeedback: 'AI 學習回饋',
          extendedLearning: {
            relatedKnowledgeNodes: ['教育基本法'],
            confusingConcepts: [],
            relatedExamPoints: [],
          },
        }),
      }),
    })) as unknown as typeof fetch;
    const provider = new OpenAIProvider({ apiKey: 'test-api-key', fetchFn });

    await provider.explainChoiceQuestion(createQuestion(), 'A');

    const requestBody = JSON.parse(String(vi.mocked(fetchFn).mock.calls[0][1]?.body)) as {
      input: Array<{ content: string }>;
    };
    const systemPrompt = requestBody.input[0].content;
    const userPrompt = requestBody.input[1].content;

    expect(systemPrompt).toContain('questionKeyPoint');
    expect(systemPrompt).toContain('optionAnalysis A/B/C/D');
    expect(systemPrompt).toContain('learningFeedback');
    expect(systemPrompt).toContain('extendedLearning');
    expect(userPrompt).toContain('保障學生受教權並促進適性發展');
  });

  it('falls back to Mock with a visible reason when OpenAI request fails', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const provider = new OpenAIProvider({ apiKey: 'test-api-key', fetchFn });

    const explanation = await provider.explainChoiceQuestion(createQuestion(), 'A');

    expect(explanation.provider).toBe('mock');
    expect(explanation.questionKeyPoint).toBe('OpenAI 分析失敗，已改用 Mock 分析。');
    expect(explanation.learningFeedback).toBe('OpenAI 分析失敗，已改用 Mock 分析。');
  });
});

function createQuestion(): Question {
  return {
    id: 'Q001',
    year: '113',
    category: '國小',
    subject: '教育原理',
    questionNumber: '1',
    type: '選擇題',
    score: 2,
    group: '教育法規',
    learningTheme: '教育法規',
    knowledgeNode: '教育基本法',
    stem: '下列何者最符合教育基本法的精神？',
    optionA: '只強調升學競爭',
    optionB: '保障學生受教權並促進適性發展',
    optionC: '以單一標準評定所有學生',
    optionD: '將學校行政效率置於學生權益之前',
    correctAnswer: 'B',
  };
}
