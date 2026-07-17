import type { ConceptEvidence } from '../../types/SmartFeedback';

export function calculateFeedbackLevel({
  coveredConcepts,
  missingConcepts,
  matchedKeywords,
}: {
  coveredConcepts: readonly ConceptEvidence[];
  missingConcepts: readonly string[];
  matchedBonusConcepts: readonly string[];
  matchedKeywords: readonly string[];
}): 1 | 2 | 3 | 4 | 5 {
  const hasStrongConcept = coveredConcepts.some((concept) => concept.confidence === 'strong');

  if (coveredConcepts.length === 0) {
    return matchedKeywords.length >= 2 ? 2 : 1;
  }

  if (missingConcepts.length === 0) {
    return hasStrongConcept ? 5 : 4;
  }

  if (hasStrongConcept) {
    return 4;
  }

  return 3;
}

export function calculateAverageFeedbackLevel(
  levels: readonly number[],
): 1 | 2 | 3 | 4 | 5 | null {
  if (levels.length === 0) {
    return null;
  }

  const average = levels.reduce((sum, level) => sum + level, 0) / levels.length;
  const rounded = Math.round(average);
  return Math.max(1, Math.min(5, rounded)) as 1 | 2 | 3 | 4 | 5;
}

export function getFeedbackSummary(level: 1 | 2 | 3 | 4 | 5): string {
  switch (level) {
    case 5:
      return '核心概念完整，答案已涵蓋主要重點。';
    case 4:
      return '概念大致完整，可再補充少量支持內容。';
    case 3:
      return '已有正確方向，但仍缺少重要核心概念。';
    case 2:
      return '只有少量相關線索，尚不足以確認主要概念。';
    case 1:
    default:
      return '目前尚未看出明確核心概念，建議先對照參考答案修正。';
  }
}

export function toStars(level: 1 | 2 | 3 | 4 | 5): string {
  return `${'★'.repeat(level)}${'☆'.repeat(5 - level)}`;
}
