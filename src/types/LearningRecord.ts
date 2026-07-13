import type { ChoiceKey } from './question';

export interface LearningRecord {
  id: string;
  learningTheme: string;
  knowledgeNode: string;
  mastery: number;
  lastReviewedAt?: string;
  lastAnalyzedAt?: string;
  masteredCount: number;
  missingCount: number;
  recentMissing: string[];
  nextReviewDate?: string;
  updatedAt: string;

  questionId: string;
  lastAnswer?: ChoiceKey;
  lastCorrect: boolean;
  correctCount: number;
  wrongCount: number;
  familiarity: number;
  reviewCount: number;
  firstSeen?: string;
  lastSeen?: string;
  lastReview?: string;
  viewedAI: boolean;
  questionIdentity?: {
    identityVersion: 1;
    logicalKey: string;
    contentHash: string;
  };
}
