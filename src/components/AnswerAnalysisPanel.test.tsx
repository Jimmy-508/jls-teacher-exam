import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AnswerAnalysisResult } from '../types/AnswerAnalysisResult';
import AnswerAnalysisPanel from './AnswerAnalysisPanel';

describe('AnswerAnalysisPanel', () => {
  it('renders smart question bank status for essay analysis', () => {
    const html = renderToStaticMarkup(<AnswerAnalysisPanel analysis={createAnalysis()} />);

    expect(html).toContain('智慧題庫');
    expect(html).toContain('答案已掌握部分重點。');
    expect(html).not.toContain('Mock 分析');
    expect(html).not.toContain('OpenAI 分析');
  });
});

function createAnalysis(): AnswerAnalysisResult {
  return {
    questionId: 'E001',
    score: 18,
    maxScore: 25,
    rating: 4,
    mastered: ['教育目的'],
    suggestedAdditions: ['課程選擇'],
    knowledgeCoverageRate: 60,
    summary: '答案已掌握部分重點。',
    referenceAnswer: '參考答案',
    provider: 'mock',
    createdAt: '2026-07-09T00:00:00.000Z',
  };
}
