export type QuestionType = '選擇題' | '非選題';

export interface Question {
  id: string;
  year: string;
  category: string;
  subject: string;
  questionNumber: string;
  type: QuestionType;
  score: number;
  group: string;
  learningTheme: string;
  coreConcept?: string;
  knowledgeNode: string;
  stem: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: string;
  myAnswer?: string;
  isCorrect?: string;
  stemAnalysis?: string;
  optionAAnalysis?: string;
  optionBAnalysis?: string;
  optionCAnalysis?: string;
  optionDAnalysis?: string;
  essayReferenceAnswer?: string;
  solvingTechnique?: string;
  solvingTip?: string;
  confusingConcepts?: string;
  commonMistake?: string;
  familiarity?: string;
  wrongCount?: string;
  drawn?: string;
  lastReview?: string;
  nextReview?: string;
  sourcePage?: string;
  note?: string;
  shortcutKeywords?: string;
  shortcutKeyword?: string;
  coreConceptSynonyms?: string;
  bonusConcepts?: string;
}

export type ChoiceKey = 'A' | 'B' | 'C' | 'D';

export interface PracticeAnswer {
  questionId: string;
  selectedAnswer: ChoiceKey;
  correctAnswer: string;
  isCorrect: boolean;
  isGradable?: boolean;
}
