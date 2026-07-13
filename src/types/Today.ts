export interface TodayViewModel {
  greeting: string;
  motto: DailyMotto;
  focus: TodayFocus | null;
  journey: LearningJourney;
  recommendation: TodayRecommendation | null;
}

export interface TodayFocus {
  knowledgeNodeId?: string;
  learningThemeId: string;
  learningThemeName: string;
  knowledgeNodeName: string;
  questionIds: string[];
  questionCount: number;
  estimatedMinutes: number;
  reason: string;
}

export interface LearningJourney {
  answeredToday: number;
  correctToday: number;
  wrongToday: number;
  accuracyToday: number;
  items: LearningJourneyItem[];
}

export interface LearningJourneyItem {
  label: string;
  knowledgeNodeName?: string;
  value: string;
}

export interface TodayRecommendation {
  title: string;
  description: string;
  targetKnowledgeNode?: string;
  targetQuestionIds?: string[];
}

export interface DailyMotto {
  text: string;
}

export interface LearningCommit {
  date: string;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  knowledgeChanges: LearningCommitKnowledgeChange[];
}

export interface LearningCommitKnowledgeChange {
  knowledgeNodeName: string;
  familiarityDelta?: number;
  correctDelta?: number;
  wrongDelta?: number;
}
