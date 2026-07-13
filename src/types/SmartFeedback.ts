export interface ConceptAliasGroup {
  canonical: string;
  aliases: string[];
}

export interface ConceptEvidence {
  concept: string;
  matchedTerms: string[];
  source: 'core-concept' | 'synonym' | 'shortcut-keyword';
  confidence: 'strong' | 'moderate';
}

export interface SmartFeedbackInput {
  answer: string;
  coreConcept: string;
  shortcutKeywords?: string;
  coreConceptSynonyms?: string;
  bonusConcepts?: string;
}

export interface SmartFeedbackResult {
  level: 1 | 2 | 3 | 4 | 5;
  summary: string;
  coveredConcepts: ConceptEvidence[];
  missingConcepts: string[];
  matchedBonusConcepts: string[];
  suggestedBonusConcepts: string[];
}
