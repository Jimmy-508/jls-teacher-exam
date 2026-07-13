import type { AIProvider } from '../AIProvider';
import type { AnswerAnalysisResult } from '../../types/AnswerAnalysisResult';
import type { KnowledgeGapInput } from '../../types/KnowledgeGapInput';

export class MockAIProvider implements AIProvider {
  constructor(private readonly summaryOverride?: string) {}

  async analyzeEssay(input: KnowledgeGapInput): Promise<AnswerAnalysisResult> {
    const rubric = uniqueNonEmpty(input.rubric.length > 0 ? input.rubric : [input.knowledgeNode, input.learningTheme]);
    const normalizedAnswer = normalizeText(input.userAnswer);
    const normalizedReferenceAnswer = normalizeText(input.referenceAnswer);

    if (
      normalizedReferenceAnswer.length > 0 &&
      (normalizedAnswer === normalizedReferenceAnswer ||
        calculateTextSimilarity(input.userAnswer, input.referenceAnswer) >= 0.9)
    ) {
      return {
        questionId: input.questionId,
        score: input.maxScore,
        maxScore: input.maxScore,
        rating: 5,
        mastered: rubric,
        suggestedAdditions: [],
        knowledgeCoverageRate: 100,
        summary: '答案已完整涵蓋本題核心重點。',
        referenceAnswer: input.referenceAnswer,
        provider: 'mock',
        createdAt: new Date().toISOString(),
      };
    }

    const mastered = rubric.filter((item) => normalizedAnswer.includes(normalizeText(item)));
    const suggestedAdditions = rubric.filter((item) => !mastered.includes(item));
    const knowledgeCoverageRate = calculateCoverage(mastered, rubric);
    const score = Math.round((input.maxScore * knowledgeCoverageRate) / 100);

    return {
      questionId: input.questionId,
      score,
      maxScore: input.maxScore,
      rating: calculateRating(score, input.maxScore),
      mastered,
      suggestedAdditions,
      knowledgeCoverageRate,
      summary: this.summaryOverride ?? buildSummary(mastered, suggestedAdditions),
      referenceAnswer: input.referenceAnswer,
      provider: 'mock',
      createdAt: new Date().toISOString(),
    };
  }
}

export function calculateCoverage(mastered: readonly string[], rubric: readonly string[]): number {
  const uniqueRubric = uniqueNonEmpty(rubric);

  if (uniqueRubric.length === 0) {
    return 0;
  }

  const masteredSet = new Set(uniqueNonEmpty(mastered));
  const coveredCount = uniqueRubric.filter((item) => masteredSet.has(item)).length;
  return Math.round((coveredCount / uniqueRubric.length) * 100);
}

export function calculateRating(score: number, maxScore: number): number {
  if (maxScore <= 0) {
    return 1;
  }

  const percentage = Math.max(0, Math.min(100, (score / maxScore) * 100));
  return Math.max(1, Math.min(5, Math.ceil(percentage / 20)));
}

function buildSummary(mastered: readonly string[], suggestedAdditions: readonly string[]): string {
  if (suggestedAdditions.length === 0) {
    return '答案已涵蓋主要知識點，後續可整理成更精簡的架構。';
  }

  if (mastered.length === 0) {
    return '答案尚未對應到核心知識點，建議先補上關鍵概念。';
  }

  return '答案已掌握部分重點，建議補充缺少的知識點。';
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\p{P}\p{S}]/gu, '');
}

export function calculateTextSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (normalizedLeft.length === 0 && normalizedRight.length === 0) {
    return 1;
  }

  if (normalizedLeft.length === 0 || normalizedRight.length === 0) {
    return 0;
  }

  const distance = calculateLevenshteinDistance(normalizedLeft, normalizedRight);
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  return 1 - distance / maxLength;
}

function calculateLevenshteinDistance(left: string, right: string): number {
  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const currentRow = [leftIndex + 1];

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      currentRow[rightIndex + 1] = Math.min(
        currentRow[rightIndex] + 1,
        previousRow[rightIndex + 1] + 1,
        previousRow[rightIndex] + substitutionCost,
      );
    }

    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  return previousRow[right.length];
}
