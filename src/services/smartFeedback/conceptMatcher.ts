import type { ConceptAliasGroup, ConceptEvidence } from '../../types/SmartFeedback';
import { normalizeTerm, normalizeText } from './textNormalizer';

const MIN_KEYWORD_LENGTH_FOR_SINGLE_MODERATE_HIT = 4;
const GENERIC_TERMS = new Set(['學生', '教學', '學習', '評量', '課程', '教師', '教育']);
const FUNCTION_WORD_PATTERN = /[的之於以並來進行]/g;

export interface ConceptMatchResult {
  coveredConcepts: ConceptEvidence[];
  missingConcepts: string[];
  matchedKeywords: string[];
}

export function matchConcepts(
  answer: string,
  aliasGroups: readonly ConceptAliasGroup[],
  shortcutKeywords: readonly string[],
): ConceptMatchResult {
  const normalizedAnswer = normalizeText(answer);
  const compactAnswer = normalizeTerm(answer);
  const coveredConcepts: ConceptEvidence[] = [];
  const missingConcepts: string[] = [];
  const keywordHits = shortcutKeywords.filter((keyword) => termMatches(compactAnswer, keyword));
  const aliasTermsByConcept = buildAliasTermsByConcept(aliasGroups);

  aliasGroups.forEach((group) => {
    const compoundParts = splitCompoundConcept(group.canonical);
    const directTerms = aliasTermsByConcept.get(group.canonical) ?? [group.canonical, ...group.aliases].filter(Boolean);
    const directHit = findTermHit(compactAnswer, directTerms);

    if (directHit) {
      coveredConcepts.push({
        concept: group.canonical,
        matchedTerms: [directHit],
        source: directHit === group.canonical ? 'core-concept' : 'synonym',
        confidence: 'strong',
      });
      return;
    }

    if (compoundParts.length > 1) {
      const partResults = compoundParts.map((part) => {
        const partTerms = aliasTermsByConcept.get(part) ?? [part];
        return {
          part,
          directHit: findTermHit(compactAnswer, partTerms),
        };
      });

      partResults
        .filter((result) => result.directHit)
        .forEach((result) => {
          coveredConcepts.push({
            concept: result.part,
            matchedTerms: [result.directHit ?? result.part],
            source: result.directHit === result.part ? 'core-concept' : 'synonym',
            confidence: 'strong',
          });
        });

      partResults
        .filter((result) => !result.directHit)
        .forEach((result) => {
          missingConcepts.push(result.part);
        });

      return;
    }

    const relatedKeywordHits = keywordHits.filter((keyword) => isUsefulKeyword(keyword, normalizedAnswer));

    if (
      relatedKeywordHits.length >= 2 ||
      (aliasGroups.length === 1 && relatedKeywordHits.some((keyword) => isHighlySpecificKeyword(keyword)))
    ) {
      coveredConcepts.push({
        concept: group.canonical,
        matchedTerms: relatedKeywordHits.slice(0, 3),
        source: 'shortcut-keyword',
        confidence: relatedKeywordHits.length >= 3 ? 'strong' : 'moderate',
      });
      return;
    }

    missingConcepts.push(group.canonical);
  });

  const dedupedCoveredConcepts = deduplicateSemanticConcepts(dedupeEvidence(coveredConcepts));

  return {
    coveredConcepts: dedupedCoveredConcepts,
    missingConcepts: removeRedundantMissingConcepts(missingConcepts, dedupedCoveredConcepts),
    matchedKeywords: keywordHits,
  };
}

export function matchBonusConcepts(answer: string, bonusConcepts: readonly string[]): string[] {
  const compactAnswer = normalizeTerm(answer);
  return bonusConcepts.filter((concept) => termMatches(compactAnswer, concept));
}

function termMatches(compactAnswer: string, term: string): boolean {
  const normalizedTerm = normalizeTerm(term);

  if (!normalizedTerm || GENERIC_TERMS.has(normalizedTerm)) {
    return false;
  }

  if (compactAnswer.includes(normalizedTerm)) {
    return true;
  }

  if (hasReasonablePhraseMatch(compactAnswer, normalizedTerm)) {
    return true;
  }

  return normalizedTerm.length >= 5 && compactAnswer.includes(normalizedTerm.slice(0, Math.max(4, normalizedTerm.length - 1)));
}

export function splitCompoundConcept(value: string): string[] {
  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue.length > 24 || !/[與和及、/＋+&並]/.test(normalizedValue)) {
    return normalizedValue ? [normalizedValue] : [];
  }

  const parts = normalizedValue
    .split(/以及|並且|與|和|及|、|\/|＋|\+|&|並/g)
    .map(normalizeConceptUnit)
    .filter((part) => part.length >= 2);

  if (parts.length < 2 || parts.some((part) => GENERIC_TERMS.has(normalizeTerm(part)))) {
    return [normalizedValue];
  }

  return Array.from(new Set(parts));
}

export function normalizeConceptUnit(value: string): string {
  return value.trim().replace(/^與|^和|^及|^並|與$|和$|及$|並$/g, '').trim();
}

export function isCompoundConceptCovered(concept: string, coveredConcepts: readonly ConceptEvidence[]): boolean {
  const parts = splitCompoundConcept(concept);

  if (parts.length <= 1) {
    return coveredConcepts.some((covered) => normalizeTerm(covered.concept) === normalizeTerm(concept));
  }

  const coveredTerms = new Set(coveredConcepts.map((covered) => normalizeTerm(covered.concept)));
  return parts.every((part) => coveredTerms.has(normalizeTerm(part)));
}

export function removeRedundantMissingConcepts(
  missingConcepts: readonly string[],
  coveredConcepts: readonly ConceptEvidence[],
): string[] {
  const coveredTerms = new Set(coveredConcepts.map((covered) => normalizeTerm(covered.concept)));
  const result: string[] = [];

  missingConcepts.forEach((concept) => {
    const parts = splitCompoundConcept(concept);
    const conceptsToAdd =
      parts.length > 1
        ? parts.filter((part) => !coveredTerms.has(normalizeTerm(part)))
        : [concept].filter((part) => !coveredTerms.has(normalizeTerm(part)));

    conceptsToAdd.forEach((item) => {
      const normalizedItem = normalizeTerm(item);

      if (normalizedItem && !result.some((existing) => normalizeTerm(existing) === normalizedItem)) {
        result.push(item);
      }
    });
  });

  return result.filter((concept) => !isCompoundConceptCovered(concept, coveredConcepts));
}

export function deduplicateSemanticConcepts(evidence: readonly ConceptEvidence[]): ConceptEvidence[] {
  const byNormalizedConcept = new Map<string, ConceptEvidence>();

  evidence.forEach((item) => {
    const normalizedConcept = normalizeTerm(item.concept);
    const existing = byNormalizedConcept.get(normalizedConcept);

    if (!existing || confidenceRank(item.confidence) > confidenceRank(existing.confidence)) {
      byNormalizedConcept.set(normalizedConcept, item);
    }
  });

  return Array.from(byNormalizedConcept.values());
}

function findTermHit(compactAnswer: string, terms: readonly string[]): string | undefined {
  return terms.find((term) => termMatches(compactAnswer, term));
}

function buildAliasTermsByConcept(aliasGroups: readonly ConceptAliasGroup[]): Map<string, string[]> {
  const map = new Map<string, string[]>();

  aliasGroups.forEach((group) => {
    const existing = map.get(group.canonical) ?? [];
    map.set(group.canonical, Array.from(new Set([...existing, group.canonical, ...group.aliases].filter(Boolean))));
  });

  return map;
}

function isUsefulKeyword(keyword: string, normalizedAnswer: string): boolean {
  const normalizedKeyword = normalizeTerm(keyword);

  if (GENERIC_TERMS.has(normalizedKeyword)) {
    return false;
  }

  if (normalizedKeyword.length >= MIN_KEYWORD_LENGTH_FOR_SINGLE_MODERATE_HIT) {
    return true;
  }

  return normalizedAnswer.length > 20;
}

function isHighlySpecificKeyword(keyword: string): boolean {
  const normalizedKeyword = normalizeTerm(keyword);
  return normalizedKeyword.length >= 5 && !GENERIC_TERMS.has(normalizedKeyword);
}

function hasReasonablePhraseMatch(compactAnswer: string, normalizedTerm: string): boolean {
  const compactTerm = normalizedTerm.replace(FUNCTION_WORD_PATTERN, '');

  if (compactTerm.length < 4 || GENERIC_TERMS.has(compactTerm)) {
    return false;
  }

  const equivalentSets = getSemanticEquivalentSets(compactTerm);

  if (equivalentSets.length > 0) {
    return equivalentSets.every((set) => set.some((term) => compactAnswer.includes(normalizeTerm(term))));
  }

  const units = splitMeaningfulUnits(compactTerm);

  if (units.length >= 2) {
    return units.every((unit) => compactAnswer.includes(unit));
  }

  return false;
}

function getSemanticEquivalentSets(term: string): string[][] {
  const sets: string[][] = [];

  if (/連結|關聯/.test(term)) {
    sets.push(['連結', '關聯', '建立關聯', '建立連結']);
  }

  if (/舊經驗|既有知識|原有知識|新舊知識/.test(term)) {
    sets.push(['舊經驗', '既有知識', '原有知識', '新知', '新舊知識']);
  }

  if (/概念架構|架構|組織/.test(term)) {
    sets.push(['概念架構', '架構', '組織', '整理', '分類']);
  }

  if (/回饋/.test(term)) {
    sets.push(['回饋', '回應', '修正']);
  }

  return sets;
}

function splitMeaningfulUnits(term: string): string[] {
  return term
    .split(/與|和|及|以及|、|\/|＋|\+|&|並且|並/g)
    .map((unit) => unit.replace(FUNCTION_WORD_PATTERN, '').trim())
    .filter((unit) => unit.length >= 2 && !GENERIC_TERMS.has(unit));
}

function dedupeEvidence(evidence: readonly ConceptEvidence[]): ConceptEvidence[] {
  const byConcept = new Map<string, ConceptEvidence>();

  evidence.forEach((item) => {
    const existing = byConcept.get(item.concept);

    if (!existing || confidenceRank(item.confidence) > confidenceRank(existing.confidence)) {
      byConcept.set(item.concept, item);
    }
  });

  return Array.from(byConcept.values());
}

function confidenceRank(confidence: ConceptEvidence['confidence']): number {
  return confidence === 'strong' ? 2 : 1;
}
