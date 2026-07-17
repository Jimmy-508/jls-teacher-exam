import type { ChoiceKey, PracticeAnswer, QuestionType } from './question';

export type PracticeSessionStatus = 'active' | 'completed';

export interface PracticeSession {
  id: string;
  startTime: string;
  endTime?: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  durationSeconds: number;
  questionType: QuestionType;
  questionIds: string[];
  currentIndex: number;
  answers: PracticeAnswer[];
  status: PracticeSessionStatus;
  mode?: 'standard' | 'wrongElimination';
  initialQuestionIds?: string[];
  remainingQuestionIds?: string[];
  attemptCount?: number;
  averageFeedbackLevel?: 1 | 2 | 3 | 4 | 5;
  completedEssayCount?: number;
  completedEssayQuestionIds?: string[];
}

export interface PracticeSessionAnswerInput {
  questionId: string;
  selectedAnswer: ChoiceKey;
  correctAnswer: string;
  isCorrect: boolean;
}
