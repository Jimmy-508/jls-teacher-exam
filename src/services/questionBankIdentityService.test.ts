import { describe, expect, it } from 'vitest';
import type { Question } from '../types/question';
import { buildQuestionLogicalKey } from './questionBankIdentityService';

describe('questionBankIdentityService', () => {
  it('keeps session exam years as distinct logical identity values', () => {
    const firstSession = createQuestion({ id: 'Q108-1', year: '108-1' });
    const secondSession = createQuestion({ id: 'Q108-2', year: '108-2' });

    expect(buildQuestionLogicalKey(firstSession)).not.toBe(buildQuestionLogicalKey(secondSession));
    expect(buildQuestionLogicalKey(firstSession)).toContain('108-1');
    expect(buildQuestionLogicalKey(secondSession)).toContain('108-2');
  });
});

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'Q1',
    year: '108-1',
    category: '中等學校',
    subject: '青少年發展與輔導',
    questionNumber: '1',
    type: '選擇題',
    score: 2,
    group: '發展理論',
    learningTheme: '發展理論',
    knowledgeNode: '青少年發展',
    stem: '題幹',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
    ...overrides,
  };
}
