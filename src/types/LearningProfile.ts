export interface LearningProfile {
  totalAnswers: number;
  totalCorrect: number;
  totalWrong: number;
  averageFamiliarity: number;
  currentWrongQuestions: number;
  recentPracticeDate?: string;
}
