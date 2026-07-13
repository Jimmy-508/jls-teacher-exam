import type { KnowledgeNode } from './KnowledgeNode';

export type KnowledgeRelationType = 'related' | 'parent' | 'child' | 'sameCategory';

export interface KnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KnowledgeRelationType;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}
