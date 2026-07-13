import { createProvider } from '../ai/AIProviderFactory';
import type { AIProvider } from '../ai/AIProvider';
import type { AnswerAnalysisResult } from '../types/AnswerAnalysisResult';
import type { KnowledgeGapInput } from '../types/KnowledgeGapInput';

export class KnowledgeGapEngine {
  constructor(private readonly provider?: AIProvider) {}

  async analyzeAnswer(input: KnowledgeGapInput): Promise<AnswerAnalysisResult> {
    const provider = this.provider ?? (await createProvider());
    return provider.analyzeEssay(input);
  }
}

export async function analyzeAnswer(input: KnowledgeGapInput): Promise<AnswerAnalysisResult> {
  return new KnowledgeGapEngine().analyzeAnswer(input);
}
