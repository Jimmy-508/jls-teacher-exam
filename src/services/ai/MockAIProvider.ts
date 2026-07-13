import type { ChoiceExplanation } from '../../types/ChoiceExplanation';
import type { ChoiceKey, Question } from '../../types/question';
import type { AnswerAnalysisResult } from '../../types/AnswerAnalysisResult';
import { MockAIProvider as EssayMockAIProvider } from '../../ai/providers/MockAIProvider';
import type { AIProvider, EssayEvaluationRequest } from './AIProvider';

const MOCK_NOTICE = '目前使用 Mock 分析，尚未啟用 OpenAI。請設定 VITE_OPENAI_API_KEY 以啟用 AI 分析。';

export class MockAIProvider implements AIProvider {
  private readonly essayProvider = new EssayMockAIProvider();

  constructor(private readonly notice = MOCK_NOTICE) {}

  async explainChoiceQuestion(question: Question, userAnswer: ChoiceKey): Promise<ChoiceExplanation> {
    return {
      questionId: question.id,
      questionKeyPoint: this.notice,
      optionAnalysis: {
        A: '',
        B: '',
        C: '',
        D: '',
      },
      learningFeedback: this.notice,
      extendedLearning: {
        relatedKnowledgeNodes: [],
        confusingConcepts: [],
        relatedExamPoints: [],
        recommendedPracticeCount: 0,
      },
      provider: 'mock',
      createdAt: new Date().toISOString(),
    };
  }

  async evaluateEssay(request: EssayEvaluationRequest): Promise<AnswerAnalysisResult> {
    const result = await this.essayProvider.analyzeEssay({
      questionId: request.questionId,
      questionText: request.questionText,
      learningTheme: request.learningTheme,
      knowledgeNode: request.knowledgeNode,
      userAnswer: request.answerText,
      referenceAnswer: request.referenceAnswer ?? '',
      rubric: request.rubric,
      maxScore: request.maxScore,
    });
    return {
      ...result,
      summary: this.notice,
    };
  }
}
