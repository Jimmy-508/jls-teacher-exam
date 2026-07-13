import { describe, expect, it } from 'vitest';
import {
  buildKnowledgeGraph,
  buildKnowledgeNodes,
  calculateWrongRate,
  detectWeakKnowledgeNodes,
  getQuestionsByKnowledgeNode,
} from './knowledgeService';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';

const questions: Question[] = [
  createQuestion('q1', '評量'),
  createQuestion('q2', '評量'),
  createQuestion('q3', '課程'),
];

const records: LearningRecord[] = [
  createRecord('q1', 0, 2, 1),
  createRecord('q2', 1, 0, 3),
  createRecord('q3', 2, 0, 4),
];

describe('knowledgeService', () => {
  it('groups questions into knowledge nodes', () => {
    const nodes = buildKnowledgeNodes(questions, records);
    const assessmentNode = nodes.find((node) => node.name === '評量');

    expect(assessmentNode?.questionIds).toEqual(['q1', 'q2']);
    expect(assessmentNode?.wrongCount).toBe(2);
    expect(assessmentNode?.averageFamiliarity).toBe(2);
  });

  it('detects weak knowledge nodes', () => {
    const weakNodes = detectWeakKnowledgeNodes(buildKnowledgeNodes(questions, records));
    expect(weakNodes.map((node) => node.name)).toContain('評量');
  });

  it('calculates wrong rate and filters node questions', () => {
    const assessmentNode = buildKnowledgeNodes(questions, records).find((node) => node.name === '評量');

    expect(assessmentNode ? calculateWrongRate(assessmentNode) : 0).toBe(1);
    expect(getQuestionsByKnowledgeNode(questions, '課程').map((question) => question.id)).toEqual(['q3']);
  });

  it('builds a derived knowledge graph without full questions', () => {
    const graph = buildKnowledgeGraph(buildKnowledgeNodes(questions, records));

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0]).not.toHaveProperty('stem');
  });
});

function createQuestion(id: string, knowledgeNode: string): Question {
  return {
    id,
    year: '113',
    category: '國小',
    subject: '教育',
    questionNumber: id,
    type: '選擇題',
    score: 2,
    group: '類別',
    learningTheme: '類別',
    knowledgeNode,
    stem: '題幹',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
  };
}

function createRecord(questionId: string, correctCount: number, wrongCount: number, familiarity: number): LearningRecord {
  return {
    id: questionId,
    learningTheme: '',
    knowledgeNode: '',
    mastery: familiarity * 25,
    masteredCount: 0,
    missingCount: 0,
    recentMissing: [],
    updatedAt: '2026-07-06T00:00:00.000Z',
    questionId,
    lastAnswer: 'A',
    lastCorrect: wrongCount === 0,
    correctCount,
    wrongCount,
    familiarity,
    reviewCount: correctCount + wrongCount,
    viewedAI: false,
  };
}
