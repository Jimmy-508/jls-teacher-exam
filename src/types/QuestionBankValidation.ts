export interface ValidationIssue {
  level: 'error' | 'warning';
  questionId?: string;
  rowNumber?: number;
  field?: string;
  message: string;
}

export interface QuestionBankValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    totalQuestions: number;
    yearCount: number;
    subjectCount: number;
    learningThemeCount: number;
    knowledgeNodeCount: number;
    choiceQuestionCount: number;
    essayQuestionCount: number;
  };
}

