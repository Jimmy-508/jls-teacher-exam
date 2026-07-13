export interface KnowledgeNode {
  id: string;
  name: string;
  questionIds: string[];
  questionCount: number;
  wrongCount: number;
  averageFamiliarity: number;
}
