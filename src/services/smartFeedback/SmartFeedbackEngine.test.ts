import { describe, expect, it } from 'vitest';
import { analyzeSmartFeedback } from './SmartFeedbackEngine';

describe('SmartFeedbackEngine', () => {
  it('matches core concepts, synonyms, shortcut keywords, and bonus concepts without AI', () => {
    const result = analyzeSmartFeedback({
      answer: '教師可用形成評量掌握學生狀態，給予即時回饋並調整教學，也可搭配多元評量。',
      coreConcept: '形成性評量|教學調整',
      shortcutKeywords: '即時回饋|調整教學',
      coreConceptSynonyms: '形成性評量=形成評量/過程評量|教學調整=調整教學',
      bonusConcepts: '多元評量|個別化回饋',
    });

    expect(result.coveredConcepts.map((concept) => concept.concept)).toContain('形成性評量');
    expect(result.coveredConcepts.map((concept) => concept.concept)).toContain('教學調整');
    expect(result.matchedBonusConcepts).toContain('多元評量');
    expect(result.suggestedBonusConcepts).toContain('個別化回饋');
    expect(result.missingConcepts).not.toContain('形成性評量');
  });

  it('does not treat a generic education term alone as concept coverage', () => {
    const result = analyzeSmartFeedback({
      answer: '教師應該注意學生學習。',
      coreConcept: '形成性評量',
      shortcutKeywords: '學生|學習',
      coreConceptSynonyms: '形成性評量=形成評量',
    });

    expect(result.coveredConcepts).toHaveLength(0);
    expect(result.missingConcepts).toContain('形成性評量');
    expect(result.level).toBe(1);
  });

  it('returns a level 1 feedback result for blank answers', () => {
    const result = analyzeSmartFeedback({
      answer: '   ',
      coreConcept: '正向管教',
      shortcutKeywords: '修復關係',
      bonusConcepts: '合理界線',
    });

    expect(result.level).toBe(1);
    expect(result.coveredConcepts).toEqual([]);
    expect(result.missingConcepts).toContain('正向管教');
    expect(result.suggestedBonusConcepts).toContain('合理界線');
  });

  it('treats a compound concept as covered when all child concepts are covered', () => {
    const result = analyzeSmartFeedback({
      answer: '我會使用精緻化連結舊經驗，並透過組織化整理概念。',
      coreConcept: '精緻化與組織化',
    });

    expect(result.coveredConcepts.map((concept) => concept.concept)).toEqual(['精緻化', '組織化']);
    expect(result.missingConcepts).not.toContain('精緻化與組織化');
    expect(result.missingConcepts).toHaveLength(0);
    expect(result.level).toBe(5);
  });

  it('only suggests the missing child concept when a compound concept is partially covered', () => {
    const result = analyzeSmartFeedback({
      answer: '我會透過精緻化連結舊經驗。',
      coreConcept: '精緻化與組織化',
    });

    expect(result.coveredConcepts.map((concept) => concept.concept)).toContain('精緻化');
    expect(result.missingConcepts).toEqual(['組織化']);
    expect(result.missingConcepts).not.toContain('精緻化與組織化');
  });

  it('covers compound child concepts through synonyms', () => {
    const result = analyzeSmartFeedback({
      answer: '我會用意義連結處理新知，也會使用架構整理來安排內容。',
      coreConcept: '精緻化與組織化',
      coreConceptSynonyms: '精緻化=精緻處理/意義連結|組織化=組織策略/架構整理',
    });

    expect(result.coveredConcepts.map((concept) => concept.concept)).toEqual(['精緻化', '組織化']);
    expect(result.missingConcepts).toHaveLength(0);
    expect(result.level).toBe(5);
  });

  it('does not suggest bonus concepts already written in the answer', () => {
    const result = analyzeSmartFeedback({
      answer: '形成性評量可提供即時回饋，也可搭配提取練習。',
      coreConcept: '形成性評量',
      bonusConcepts: '提取練習|間隔練習|自我解釋',
    });

    expect(result.matchedBonusConcepts).toContain('提取練習');
    expect(result.suggestedBonusConcepts).not.toContain('提取練習');
  });

  it('matches reasonable equivalent wording without the exact concept string', () => {
    const result = analyzeSmartFeedback({
      answer: '學生能把新知和原有知識建立關聯，讓內容更有意義。',
      coreConcept: '連結舊經驗',
    });

    expect(result.coveredConcepts.map((concept) => concept.concept)).toContain('連結舊經驗');
    expect(result.missingConcepts).toHaveLength(0);
  });

  it('uses multiple shortcut keywords as moderate or strong concept evidence', () => {
    const moderate = analyzeSmartFeedback({
      answer: '教師可蒐集學習證據並提供即時回饋。',
      coreConcept: '形成性評量',
      shortcutKeywords: '學習證據|即時回饋|調整教學',
    });
    const strong = analyzeSmartFeedback({
      answer: '教師可蒐集學習證據，提供即時回饋，並調整教學。',
      coreConcept: '形成性評量',
      shortcutKeywords: '學習證據|即時回饋|調整教學',
    });

    expect(moderate.coveredConcepts[0]?.confidence).toBe('moderate');
    expect(strong.coveredConcepts[0]?.confidence).toBe('strong');
  });

  it('can return five stars when every core concept is covered even without bonus concepts', () => {
    const result = analyzeSmartFeedback({
      answer: '形成性評量重視教學過程中的診斷與回饋。',
      coreConcept: '形成性評量',
      bonusConcepts: '個別化回饋',
    });

    expect(result.missingConcepts).toHaveLength(0);
    expect(result.level).toBe(5);
    expect(result.suggestedBonusConcepts).toContain('個別化回饋');
  });
});
