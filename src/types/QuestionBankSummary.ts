export interface QuestionBankSummary {
  totalQuestions: number;
  byYear: Record<string, number>;
  bySubject: Record<string, number>;
  byLearningTheme: Record<string, number>;
  byCoreConcept: Record<string, number>;
  byKnowledgeNode: Record<string, number>;
  byQuestionType: Record<string, number>;
  singletonCoreConcepts: string[];
  singletonKnowledgeNodes: string[];
  smallLearningThemes: string[];
}
