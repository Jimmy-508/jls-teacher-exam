export interface AnswerAnalysisResult {
  questionId: string;
  score: number;
  maxScore: number;
  rating: number;
  mastered: string[];
  suggestedAdditions: string[];
  knowledgeCoverageRate: number;
  summary: string;
  referenceAnswer: string;
  provider: 'mock' | 'openai' | 'manual';
  createdAt: string;
}

