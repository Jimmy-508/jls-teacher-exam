import type { KnowledgeGraph, KnowledgeEdge } from '../types/KnowledgeGraph';
import type { KnowledgeNode } from '../types/KnowledgeNode';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';

export type KnowledgeNodeStatus = 'NeedsReview' | 'Learning' | 'Stable' | 'Unseen';

const WEAK_WRONG_RATE_THRESHOLD = 0.5;
const WEAK_FAMILIARITY_THRESHOLD = 1.5;

interface KnowledgeNodeAccumulator {
  id: string;
  name: string;
  questionIds: string[];
  wrongCount: number;
  familiarityTotal: number;
  recordCount: number;
  answerCount: number;
}

export function buildKnowledgeNodes(
  questions: readonly Question[],
  learningRecords: readonly LearningRecord[] = [],
): KnowledgeNode[] {
  const recordsByQuestionId = new Map(learningRecords.map((record) => [record.questionId, record]));
  const nodeMap = new Map<string, KnowledgeNodeAccumulator>();

  questions.forEach((question) => {
    const nodeName = question.knowledgeNode.trim() || '未分類';
    const nodeId = normalizeKnowledgeNodeId(nodeName);
    const currentNode = nodeMap.get(nodeId) ?? createKnowledgeNodeAccumulator(nodeId, nodeName);
    const record = recordsByQuestionId.get(question.id);

    currentNode.questionIds.push(question.id);

    if (record) {
      currentNode.wrongCount += record.wrongCount;
      currentNode.familiarityTotal += record.familiarity;
      currentNode.recordCount += 1;
      currentNode.answerCount += record.correctCount + record.wrongCount;
    }

    nodeMap.set(nodeId, currentNode);
  });

  return Array.from(nodeMap.values())
    .map((node) => ({
      id: node.id,
      name: node.name,
      questionIds: node.questionIds,
      questionCount: node.questionIds.length,
      wrongCount: node.wrongCount,
      averageFamiliarity: node.recordCount > 0 ? Number((node.familiarityTotal / node.recordCount).toFixed(2)) : 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'));
}

export function buildKnowledgeGraph(nodes: readonly KnowledgeNode[]): KnowledgeGraph {
  return {
    nodes: [...nodes],
    edges: buildKnowledgeEdges(nodes),
  };
}

export function detectWeakKnowledgeNodes(nodes: readonly KnowledgeNode[]): KnowledgeNode[] {
  return nodes.filter((node) => {
    const wrongRate = calculateWrongRate(node);
    const hasWrongSignal = wrongRate >= WEAK_WRONG_RATE_THRESHOLD && node.wrongCount > 0;
    const hasFamiliaritySignal = node.averageFamiliarity > 0 && node.averageFamiliarity <= WEAK_FAMILIARITY_THRESHOLD;

    return hasWrongSignal || hasFamiliaritySignal;
  });
}

export function getQuestionsByKnowledgeNode(questions: readonly Question[], knowledgeNodeName: string): Question[] {
  return questions.filter((question) => question.knowledgeNode === knowledgeNodeName && question.type === '選擇題');
}

export function findKnowledgeNodeById(nodes: readonly KnowledgeNode[], nodeId: string): KnowledgeNode | undefined {
  return nodes.find((node) => node.id === nodeId);
}

export function calculateWrongRate(node: KnowledgeNode): number {
  if (node.questionCount === 0) {
    return 0;
  }

  return Number((node.wrongCount / node.questionCount).toFixed(2));
}

export function getKnowledgeNodeStatus(node: KnowledgeNode, isWeak: boolean): KnowledgeNodeStatus {
  if (isWeak) {
    return 'NeedsReview';
  }

  if (node.averageFamiliarity >= 3) {
    return 'Stable';
  }

  if (node.averageFamiliarity > 0) {
    return 'Learning';
  }

  return 'Unseen';
}

function createKnowledgeNodeAccumulator(id: string, name: string): KnowledgeNodeAccumulator {
  return {
    id,
    name,
    questionIds: [],
    wrongCount: 0,
    familiarityTotal: 0,
    recordCount: 0,
    answerCount: 0,
  };
}

function buildKnowledgeEdges(nodes: readonly KnowledgeNode[]): KnowledgeEdge[] {
  const edges: KnowledgeEdge[] = [];

  nodes.forEach((sourceNode, sourceIndex) => {
    nodes.slice(sourceIndex + 1).forEach((targetNode) => {
      if (sourceNode.name === targetNode.name) {
        return;
      }

      const relationType = getRelationType(sourceNode.name, targetNode.name);

      if (!relationType) {
        return;
      }

      edges.push({
        id: `${sourceNode.id}-${targetNode.id}-${relationType}`,
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        relationType,
        weight: relationType === 'sameCategory' ? 0.6 : 0.8,
      });
    });
  });

  return edges;
}

function getRelationType(sourceName: string, targetName: string): KnowledgeEdge['relationType'] | null {
  if (sourceName.includes(targetName)) {
    return 'child';
  }

  if (targetName.includes(sourceName)) {
    return 'parent';
  }

  const sourcePrefix = sourceName.slice(0, 2);
  const targetPrefix = targetName.slice(0, 2);

  if (sourcePrefix.length >= 2 && sourcePrefix === targetPrefix) {
    return 'sameCategory';
  }

  return null;
}

function normalizeKnowledgeNodeId(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '');

  return normalizedName || 'uncategorized';
}
