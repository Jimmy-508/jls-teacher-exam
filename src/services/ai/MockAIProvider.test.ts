import { describe, expect, it } from 'vitest';
import { MockAIProvider } from './MockAIProvider';
import type { Question } from '../../types/question';

describe('choice question MockAIProvider', () => {
  it('returns explicit Mock fallback notice', async () => {
    const explanation = await new MockAIProvider().explainChoiceQuestion(createQuestion(), 'A');

    expect(explanation.questionKeyPoint).toBe('目前使用 Mock 分析，尚未啟用 OpenAI。請設定 VITE_OPENAI_API_KEY 以啟用 AI 分析。');
    expect(explanation.provider).toBe('mock');
  });

  it('keeps optionAnalysis keys without fake AI content', async () => {
    const explanation = await new MockAIProvider().explainChoiceQuestion(createQuestion(), 'A');

    expect(Object.keys(explanation.optionAnalysis)).toEqual(['A', 'B', 'C', 'D']);
    expect(Object.values(explanation.optionAnalysis)).toEqual(['', '', '', '']);
  });

  it('does not generate fake AI long-form phrases', async () => {
    const explanation = await new MockAIProvider().explainChoiceQuestion(createQuestion(), 'A');
    const serializedExplanation = JSON.stringify(explanation);

    expect(serializedExplanation).not.toContain('題目真正考的是');
    expect(serializedExplanation).not.toContain('容易被關鍵字吸引');
    expect(serializedExplanation).not.toContain('判斷時要回到題幹條件');
    expect(serializedExplanation).not.toContain('避免把相近概念混用');
  });

  it('returns non-empty learning feedback', async () => {
    const explanation = await new MockAIProvider().explainChoiceQuestion(createQuestion(), 'A');

    expect(explanation.learningFeedback.trim().length).toBeGreaterThan(0);
  });

  it('returns non-empty extended learning', async () => {
    const explanation = await new MockAIProvider().explainChoiceQuestion(createQuestion(), 'A');

    expect(explanation.extendedLearning.relatedKnowledgeNodes).toEqual([]);
    expect(explanation.extendedLearning.confusingConcepts).toEqual([]);
    expect(explanation.extendedLearning.relatedExamPoints).toEqual([]);
  });
});

function createQuestion(): Question {
  return {
    id: 'Q001',
    year: '113',
    category: '國小',
    subject: '教育原理',
    questionNumber: '1',
    type: '選擇題' as Question['type'],
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
