import { describe, expect, it } from 'vitest';
import { CHOICE_QUESTION_TYPE } from './questionBankFields';
import { buildOfflineChoiceExplanation } from './offlineExplanationService';
import type { Question } from '../types/question';

describe('offlineExplanationService', () => {
  it('formats option analysis labels compactly without mutating source analysis fields', () => {
    const question = createQuestion({
      optionAAnalysis: '\u6b63\u78ba\u3002First line\nSecond line',
      optionBAnalysis: '\u932f\u8aa4\u3002First part\r\nSecond part',
      optionCAnalysis: '\u932f\u8aa4\u3002Tabbed\tcontent',
      optionDAnalysis: '',
    });

    const explanation = buildOfflineChoiceExplanation(question, 'A');

    expect(explanation.optionAnalysis.A).toBe('(A) \u9078\u9805\u6b63\u78ba\u3002First line Second line');
    expect(explanation.optionAnalysis.B).toBe('(B) \u9078\u9805\u932f\u8aa4\u3002First part Second part');
    expect(explanation.optionAnalysis.C).toBe('(C) \u9078\u9805\u932f\u8aa4\u3002Tabbed content');
    expect(explanation.optionAnalysis.D).toBe('');
    expect(question.optionAAnalysis).toBe('\u6b63\u78ba\u3002First line\nSecond line');
  });
});

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    year: '115',
    category: 'teacher',
    subject: 'subject',
    questionNumber: '1',
    type: CHOICE_QUESTION_TYPE,
    score: 2,
    group: 'theme',
    learningTheme: 'theme',
    knowledgeNode: 'node',
    stem: 'stem',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
    stemAnalysis: 'stem analysis',
    optionAAnalysis: '\u6b63\u78ba\u3002A analysis',
    optionBAnalysis: '\u932f\u8aa4\u3002B analysis',
    optionCAnalysis: '\u932f\u8aa4\u3002C analysis',
    optionDAnalysis: '\u932f\u8aa4\u3002D analysis',
    ...overrides,
  };
}
