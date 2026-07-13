import { calculateFamiliarity, createLearningRecord } from './learningEngine';
import type { AnswerAnalysis, AnswerAnalysisRequest } from '../types/AnswerAnalysis';
import type { LearningRecord } from '../types/LearningRecord';

const MAX_ANALYSIS_ITEMS = 5;
const PROVIDER_NAME = 'DeterministicAnswerAnalysisEngine';

export function generateAnswerAnalysis(request: AnswerAnalysisRequest): AnswerAnalysis {
  const expectedKnowledgeNodes = uniqueNonEmpty(request.expectedKnowledgeNodes);
  const normalizedAnswer = normalizeText(request.answerText);
  const coveredNodes = expectedKnowledgeNodes.filter((node) => normalizedAnswer.includes(normalizeText(node)));
  const missingNodes = expectedKnowledgeNodes.filter((node) => !coveredNodes.includes(node));
  const totalCount = expectedKnowledgeNodes.length;
  const coveredCount = coveredNodes.length;

  return {
    questionId: request.questionId,
    masteredKnowledge: coveredNodes.slice(0, MAX_ANALYSIS_ITEMS),
    suggestedAdditions: missingNodes.slice(0, MAX_ANALYSIS_ITEMS),
    knowledgeCoverage: {
      coveredCount,
      totalCount,
      percentage: totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0,
      items: expectedKnowledgeNodes.map((knowledgeNode) => ({
        knowledgeNode,
        covered: coveredNodes.includes(knowledgeNode),
      })),
    },
    score: request.score,
    referenceAnswer: request.referenceAnswer,
    provider: PROVIDER_NAME,
    createdAt: new Date().toISOString(),
  };
}

export function applyAnswerAnalysisToLearningRecords(
  records: Record<string, LearningRecord>,
  analysis: AnswerAnalysis,
  questionIdsByKnowledgeNode: Readonly<Record<string, readonly string[]>>,
): Record<string, LearningRecord> {
  const nextRecords = { ...records };

  analysis.masteredKnowledge.forEach((knowledgeNode) => {
    updateKnowledgeNodeRecords(nextRecords, questionIdsByKnowledgeNode[knowledgeNode] ?? [], true);
  });

  analysis.suggestedAdditions.forEach((knowledgeNode) => {
    updateKnowledgeNodeRecords(nextRecords, questionIdsByKnowledgeNode[knowledgeNode] ?? [], false);
  });

  return nextRecords;
}

function updateKnowledgeNodeRecords(
  records: Record<string, LearningRecord>,
  questionIds: readonly string[],
  isMastered: boolean,
): void {
  const now = new Date().toISOString();

  questionIds.forEach((questionId) => {
    const currentRecord = records[questionId] ?? createLearningRecord(questionId);
    records[questionId] = {
      ...currentRecord,
      lastCorrect: isMastered,
      correctCount: currentRecord.correctCount + (isMastered ? 1 : 0),
      wrongCount: currentRecord.wrongCount + (isMastered ? 0 : 1),
      familiarity: calculateFamiliarity(currentRecord.familiarity, isMastered),
      reviewCount: currentRecord.reviewCount + 1,
      firstSeen: currentRecord.firstSeen ?? now,
      lastSeen: now,
      lastReview: now,
      viewedAI: true,
    };
  });
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

