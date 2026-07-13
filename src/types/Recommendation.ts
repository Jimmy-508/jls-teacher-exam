export type RecommendationActionType =
  | 'practiceKnowledgeNode'
  | 'reviewWrongQuestions'
  | 'continuePractice'
  | 'startRandomPractice';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: number;
  actionType: RecommendationActionType;
  targetKnowledgeNode?: string;
  targetQuestionIds: string[];
}
