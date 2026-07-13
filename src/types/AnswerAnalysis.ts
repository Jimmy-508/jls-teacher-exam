export interface AnswerAnalysisScore {
  earned: number;
  total: number;
}

export interface KnowledgeCoverageItem {
  knowledgeNode: string;
  covered: boolean;
}

export interface KnowledgeCoverage {
  coveredCount: number;
  totalCount: number;
  percentage: number;
  items: KnowledgeCoverageItem[];
}

export interface AnswerAnalysis {
  questionId: string;
  masteredKnowledge: string[];
  suggestedAdditions: string[];
  knowledgeCoverage: KnowledgeCoverage;
  score?: AnswerAnalysisScore;
  referenceAnswer?: string;
  provider: string;
  createdAt: string;
}

export interface AnswerAnalysisRequest {
  questionId: string;
  answerText: string;
  expectedKnowledgeNodes: string[];
  referenceAnswer?: string;
  score?: AnswerAnalysisScore;
}

