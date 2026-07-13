import { describe, expect, it } from 'vitest';
import { applyAnswerAnalysisToLearningRecords, generateAnswerAnalysis } from './answerAnalysisEngine';
import { createLearningRecord } from './learningEngine';

describe('answerAnalysisEngine', () => {
  it('generates concise mastered and suggested knowledge lists', () => {
    const analysis = generateAnswerAnalysis({
      questionId: 'essay-1',
      answerText: '我提到形成性評量與總結性評量。',
      expectedKnowledgeNodes: ['形成性評量', '總結性評量', '信度', '效度', '常模', '標準參照'],
      score: { earned: 18, total: 25 },
    });

    expect(analysis.masteredKnowledge).toEqual(['形成性評量', '總結性評量']);
    expect(analysis.suggestedAdditions).toEqual(['信度', '效度', '常模', '標準參照']);
    expect(analysis.score).toEqual({ earned: 18, total: 25 });
  });

  it('calculates coverage from KnowledgeNodes, not score', () => {
    const analysis = generateAnswerAnalysis({
      questionId: 'essay-1',
      answerText: '形成性評量',
      expectedKnowledgeNodes: ['形成性評量', '總結性評量', '信度', '效度', '常模'],
      score: { earned: 25, total: 25 },
    });

    expect(analysis.knowledgeCoverage.percentage).toBe(20);
  });

  it('limits mastered and suggested sections to five items', () => {
    const analysis = generateAnswerAnalysis({
      questionId: 'essay-1',
      answerText: '',
      expectedKnowledgeNodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    });

    expect(analysis.masteredKnowledge).toHaveLength(0);
    expect(analysis.suggestedAdditions).toHaveLength(5);
  });

  it('updates learning records from knowledge gap analysis', () => {
    const analysis = generateAnswerAnalysis({
      questionId: 'essay-1',
      answerText: '形成性評量',
      expectedKnowledgeNodes: ['形成性評量', '信度'],
    });
    const records = {
      q1: createLearningRecord('q1'),
      q2: { ...createLearningRecord('q2'), familiarity: 2 },
    };

    const updated = applyAnswerAnalysisToLearningRecords(records, analysis, {
      形成性評量: ['q1'],
      信度: ['q2'],
    });

    expect(updated.q1.familiarity).toBe(1);
    expect(updated.q1.correctCount).toBe(1);
    expect(updated.q2.familiarity).toBe(1);
    expect(updated.q2.wrongCount).toBe(1);
    expect(updated.q1.viewedAI).toBe(true);
  });
});

