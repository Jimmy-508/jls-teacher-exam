import type { SmartFeedbackInput, SmartFeedbackResult } from '../../types/SmartFeedback';
import { matchBonusConcepts, matchConcepts } from './conceptMatcher';
import { calculateFeedbackLevel, getFeedbackSummary } from './feedbackLevel';
import { parseAliasGroups, parseConcepts, parsePipeList } from './conceptParser';

export function analyzeSmartFeedback(input: SmartFeedbackInput): SmartFeedbackResult {
  const answer = input.answer.trim();
  const coreConcepts = parseConcepts(input.coreConcept);
  const aliasGroups = parseAliasGroups(input.coreConceptSynonyms, coreConcepts);
  const shortcutKeywords = parsePipeList(input.shortcutKeywords);
  const bonusConcepts = parsePipeList(input.bonusConcepts);

  if (!answer) {
    return {
      level: 1,
      summary: getFeedbackSummary(1),
      coveredConcepts: [],
      missingConcepts: aliasGroups.map((group) => group.canonical),
      matchedBonusConcepts: [],
      suggestedBonusConcepts: bonusConcepts,
    };
  }

  const conceptMatch = matchConcepts(answer, aliasGroups, shortcutKeywords);
  const matchedBonusConcepts = matchBonusConcepts(answer, bonusConcepts);
  const suggestedBonusConcepts = bonusConcepts.filter((concept) => !matchedBonusConcepts.includes(concept));
  const level = calculateFeedbackLevel({
    coveredConcepts: conceptMatch.coveredConcepts,
    missingConcepts: conceptMatch.missingConcepts,
    matchedBonusConcepts,
    matchedKeywords: conceptMatch.matchedKeywords,
  });

  return {
    level,
    summary: getFeedbackSummary(level),
    coveredConcepts: conceptMatch.coveredConcepts,
    missingConcepts: conceptMatch.missingConcepts,
    matchedBonusConcepts,
    suggestedBonusConcepts,
  };
}
