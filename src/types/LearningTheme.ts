export interface LearningTheme {
  id: string;
  subject: string;
  name: string;
  questionIds: string[];
  knowledgeNodeIds: string[];
  questionCount: number;
  choiceQuestionCount: number;
  essayQuestionCount: number;
  wrongCount: number;
  averageFamiliarity: number;
  lastReviewedAt?: string;
}
