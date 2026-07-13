import type { ChoiceExplanation } from '../../types/ChoiceExplanation';
import type { AnswerAnalysisResult } from '../../types/AnswerAnalysisResult';
import type { ChoiceKey, Question } from '../../types/question';

export interface EssayEvaluationRequest {
  questionId: string;
  questionText: string;
  learningTheme: string;
  knowledgeNode: string;
  answerText: string;
  rubric: string[];
  referenceAnswer?: string;
  maxScore: number;
}

export interface AIProvider {
  explainChoiceQuestion(question: Question, userAnswer: ChoiceKey): Promise<ChoiceExplanation>;
  evaluateEssay?(request: EssayEvaluationRequest): Promise<AnswerAnalysisResult>;
}
