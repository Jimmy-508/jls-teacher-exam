import type { KnowledgeNode } from '../types/KnowledgeNode';
import type { LearningInsight } from '../types/LearningInsight';
import type { LearningRecord } from '../types/LearningRecord';
import type { LearningTheme } from '../types/LearningTheme';
import type { PracticeSession } from '../types/PracticeSession';
import type { Question } from '../types/question';
import type { Recommendation } from '../types/Recommendation';
import { detectWeakKnowledgeNodes } from './knowledgeService';
import { buildLearningThemes, detectWeakLearningThemes } from './learningThemeService';

interface KnowledgeNodeAccumulator {
  id: string;
  name: string;
  questionIds: string[];
  wrongCount: number;
  familiarityTotal: number;
  recordCount: number;
}

const LOW_FAMILIARITY_THRESHOLD = 2;
const HIGH_FAMILIARITY_THRESHOLD = 3;

export function buildKnowledgeNodes(
  questions: readonly Question[],
  learningRecords: readonly LearningRecord[],
): KnowledgeNode[] {
  const recordsByQuestionId = new Map(learningRecords.map((record) => [record.questionId, record]));
  const nodeMap = new Map<string, KnowledgeNodeAccumulator>();

  questions.forEach((question) => {
    const nodeName = question.knowledgeNode.trim() || '未分類';
    const nodeId = normalizeId(nodeName);
    const currentNode =
      nodeMap.get(nodeId) ??
      ({
        id: nodeId,
        name: nodeName,
        questionIds: [],
        wrongCount: 0,
        familiarityTotal: 0,
        recordCount: 0,
      } satisfies KnowledgeNodeAccumulator);
    const record = recordsByQuestionId.get(question.id);

    currentNode.questionIds.push(question.id);

    if (record) {
      currentNode.wrongCount += record.wrongCount;
      currentNode.familiarityTotal += record.familiarity;
      currentNode.recordCount += 1;
    }

    nodeMap.set(nodeId, currentNode);
  });

  return Array.from(nodeMap.values()).map((node) => ({
    id: node.id,
    name: node.name,
    questionIds: node.questionIds,
    questionCount: node.questionIds.length,
    wrongCount: node.wrongCount,
    averageFamiliarity: node.recordCount > 0 ? Number((node.familiarityTotal / node.recordCount).toFixed(2)) : 0,
  }));
}

export function detectWeaknesses(knowledgeNodes: readonly KnowledgeNode[]): LearningInsight[] {
  const now = new Date().toISOString();

  return detectWeakKnowledgeNodes(knowledgeNodes).map((node) => ({
    id: `weakness-${node.id}`,
    type: 'weakness',
    title: `${node.name} 需要加強`,
    description: `這個知識節點有 ${node.wrongCount} 次錯誤紀錄，平均熟悉度為 ${node.averageFamiliarity}。`,
    relatedKnowledgeNode: node.name,
    priority: node.wrongCount + (LOW_FAMILIARITY_THRESHOLD - Math.min(node.averageFamiliarity, LOW_FAMILIARITY_THRESHOLD)),
    createdAt: now,
  }));
}

export function detectStrengths(knowledgeNodes: readonly KnowledgeNode[]): LearningInsight[] {
  const now = new Date().toISOString();

  return knowledgeNodes
    .filter((node) => node.questionCount > 0 && node.wrongCount === 0 && node.averageFamiliarity >= HIGH_FAMILIARITY_THRESHOLD)
    .map((node) => ({
      id: `strength-${node.id}`,
      type: 'strength',
      title: `${node.name} 表現穩定`,
      description: `這個知識節點目前沒有錯誤紀錄，平均熟悉度為 ${node.averageFamiliarity}。`,
      relatedKnowledgeNode: node.name,
      priority: 1,
      createdAt: now,
    }));
}

export function generateInsights(
  questions: readonly Question[],
  learningRecords: readonly LearningRecord[],
  practiceSessions: readonly PracticeSession[],
  knowledgeNodes = buildKnowledgeNodes(questions, learningRecords),
): LearningInsight[] {
  const insights = [...generateKnowledgeInsights(knowledgeNodes), ...detectStrengths(knowledgeNodes)];
  const activeSession = practiceSessions.find((session) => session.status === 'active');

  if (activeSession) {
    insights.push({
      id: `continue-${activeSession.id}`,
      type: 'reviewSuggestion',
      title: '有一份未完成練習',
      description: `目前做到第 ${activeSession.currentIndex + 1} 題，共 ${activeSession.totalQuestions} 題。`,
      priority: 3,
      createdAt: new Date().toISOString(),
    });
  }

  return insights.sort((left, right) => right.priority - left.priority);
}

export function generateKnowledgeInsights(knowledgeNodes: readonly KnowledgeNode[]): LearningInsight[] {
  const now = new Date().toISOString();
  const weakInsights = detectWeaknesses(knowledgeNodes);
  const reviewInsights = detectWeakKnowledgeNodes(knowledgeNodes).map((node) => ({
    id: `knowledge-review-${node.id}`,
    type: 'reviewSuggestion',
    title: `優先複習 ${node.name}`,
    description: `建議先練習 ${node.name} 相關題目，降低錯誤率並提高熟悉度。`,
    relatedKnowledgeNode: node.name,
    priority: Math.max(2, node.wrongCount + 1),
    createdAt: now,
  }) satisfies LearningInsight);

  return [...weakInsights, ...reviewInsights];
}

export function generateThemeInsights(learningThemes: readonly LearningTheme[]): LearningInsight[] {
  const now = new Date().toISOString();

  return detectWeakLearningThemes(learningThemes).map((theme) => ({
    id: `theme-review-${theme.id}`,
    type: 'reviewSuggestion',
    title: `優先複習 ${theme.name}`,
    description: `${theme.name} 的錯誤次數為 ${theme.wrongCount}，建議作為下一個學習主題。`,
    relatedKnowledgeNode: theme.name,
    priority: Math.max(3, theme.wrongCount + theme.questionCount),
    createdAt: now,
  }));
}

export function generateRecommendations(
  insights: readonly LearningInsight[],
  knowledgeNodes: readonly KnowledgeNode[],
): Recommendation[] {
  const recommendations: Recommendation[] = insights.map((insight) => {
    const targetNode = insight.relatedKnowledgeNode
      ? knowledgeNodes.find((node) => node.name === insight.relatedKnowledgeNode)
      : undefined;

    if (insight.type === 'weakness' && targetNode) {
      return {
        id: `recommend-review-${targetNode.id}`,
        title: `複習 ${targetNode.name}`,
        description: `優先回顧 ${targetNode.name} 的錯題與低熟悉度題目。`,
        priority: insight.priority,
        actionType: 'reviewWrongQuestions',
        targetKnowledgeNode: targetNode.name,
        targetQuestionIds: targetNode.questionIds,
      };
    }

    if (insight.type === 'strength' && targetNode) {
      return {
        id: `recommend-practice-${targetNode.id}`,
        title: `維持 ${targetNode.name} 手感`,
        description: `偶爾練習這個知識節點，保持目前熟悉度。`,
        priority: insight.priority,
        actionType: 'practiceKnowledgeNode',
        targetKnowledgeNode: targetNode.name,
        targetQuestionIds: targetNode.questionIds,
      };
    }

    return {
      id: `recommend-${insight.id}`,
      title: '繼續目前練習',
      description: '完成尚未結束的練習，讓學習紀錄保持連續。',
      priority: insight.priority,
      actionType: 'continuePractice',
      targetQuestionIds: [],
    };
  });

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'recommend-start-random-practice',
      title: '開始一輪隨機練習',
      description: '先累積作答紀錄，JLS 才能提供更準確的學習洞察。',
      priority: 1,
      actionType: 'startRandomPractice',
      targetQuestionIds: [],
    });
  }

  return recommendations.sort((left, right) => right.priority - left.priority);
}

export function generateThemeRecommendations(
  insights: readonly LearningInsight[],
  learningThemes: readonly LearningTheme[],
): Recommendation[] {
  const recommendations = insights.flatMap((insight) => {
    const targetTheme = insight.relatedKnowledgeNode
      ? learningThemes.find((theme) => theme.name === insight.relatedKnowledgeNode)
      : undefined;

    if (!targetTheme) {
      return [];
    }

    return [
      {
        id: `recommend-theme-${targetTheme.id}`,
        title: `練習 ${targetTheme.name}`,
        description: `${targetTheme.name} 是目前較需要回顧的學習主題。`,
        priority: insight.priority,
        actionType: 'practiceKnowledgeNode',
        targetKnowledgeNode: targetTheme.name,
        targetQuestionIds: targetTheme.questionIds,
      } satisfies Recommendation,
    ];
  });

  if (recommendations.length === 0 && learningThemes.length > 0) {
    const fallbackTheme = learningThemes[0];
    recommendations.push({
      id: `recommend-theme-${fallbackTheme.id}`,
      title: `練習 ${fallbackTheme.name}`,
      description: '先完成一個學習主題，建立今天的學習紀錄。',
      priority: 1,
      actionType: 'practiceKnowledgeNode',
      targetKnowledgeNode: fallbackTheme.name,
      targetQuestionIds: fallbackTheme.questionIds,
    });
  }

  return recommendations.sort((left, right) => right.priority - left.priority);
}

export function buildThemeInsightsFromQuestions(
  questions: readonly Question[],
  learningRecords: readonly LearningRecord[],
): LearningInsight[] {
  return generateThemeInsights(buildLearningThemes(questions, learningRecords));
}

function normalizeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '');
}
