export type LearningInsightType = 'weakness' | 'strength' | 'reviewSuggestion' | 'streak' | 'warning';

export interface LearningInsight {
  id: string;
  type: LearningInsightType;
  title: string;
  description: string;
  relatedKnowledgeNode?: string;
  priority: number;
  createdAt: string;
}
