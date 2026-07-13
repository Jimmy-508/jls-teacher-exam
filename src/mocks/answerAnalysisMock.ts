import type { AnswerAnalysisResult } from '../types/AnswerAnalysisResult';

export const answerAnalysisMock: AnswerAnalysisResult = {
  questionId: 'mock-answer-analysis',
  score: 18,
  maxScore: 25,
  rating: 4,
  mastered: ['教育理念', '教師角色'],
  suggestedAdditions: ['教育基本法', '法源依據'],
  knowledgeCoverageRate: 60,
  summary: '答案已掌握部分重點，建議補充缺少的知識點。',
  referenceAnswer: '參考答案應作為回顧材料，並在使用者思考後再展開閱讀。',
  provider: 'mock',
  createdAt: '2026-07-06T00:00:00.000Z',
};

