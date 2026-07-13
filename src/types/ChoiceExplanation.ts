export interface ChoiceExplanation {
  questionId: string;
  questionKeyPoint: string;
  optionAnalysis: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  learningFeedback: string;
  solvingTechnique?: string;
  confusingConcepts?: string;
  userAnswer?: string;
  extendedLearning: {
    relatedKnowledgeNodes: string[];
    confusingConcepts: string[];
    relatedExamPoints: string[];
    recommendedPracticeCount?: number;
  };
  provider: 'mock' | 'openai' | 'manual' | 'offline';
  createdAt: string;
}
