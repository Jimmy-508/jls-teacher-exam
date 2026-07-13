import type { ConceptEvidence } from '../../types/SmartFeedback';

export function calculateFeedbackLevel({
  coveredConcepts,
  missingConcepts,
  matchedBonusConcepts,
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

export function getFeedbackSummary(level: 1 | 2 | 3 | 4 | 5): string {
  switch (level) {
    case 5:
      return '核心概念完整，回答相當完整。';
    case 4:
      return '概念大致正確，但仍缺少部分重要重點。';
    case 3:
      return '方向正確，但建議再補充核心概念。';
    case 2:
      return '目前僅提及部分概念，建議重新整理重點。';
    case 1:
    default:
      return '尚未回答到本題核心概念，建議重新閱讀觀念後再作答。';
  }
}

export function toStars(level: 1 | 2 | 3 | 4 | 5): string {
  return `${'★'.repeat(level)}${'☆'.repeat(5 - level)}`;
}
