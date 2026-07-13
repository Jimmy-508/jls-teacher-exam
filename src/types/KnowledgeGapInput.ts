export interface KnowledgeGapInput {
  questionId: string;
  questionText: string;
  learningTheme: string;
  knowledgeNode: string;
  userAnswer: string;
  referenceAnswer: string;
  rubric: string[];
  maxScore: number;
}

