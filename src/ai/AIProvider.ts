import type { AnswerAnalysisResult } from '../types/AnswerAnalysisResult';
import type { KnowledgeGapInput } from '../types/KnowledgeGapInput';

export interface AIProvider {
  analyzeEssay(input: KnowledgeGapInput): Promise<AnswerAnalysisResult>;
}

