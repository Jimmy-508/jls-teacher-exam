import { describe, expect, it } from 'vitest';
import { buildLearningThemes } from './learningThemeService';
import { CHOICE_QUESTION_TYPE } from './questionBankFields';
import type { Question } from '../types/question';

describe('learning theme taxonomy', () => {
  it('does not use subject as LearningTheme card title when theme is mis-mapped', () => {
    const themes = buildLearningThemes([createQuestion({ learningTheme: '教育原理', knowledgeNode: '班級經營' })]);

    expect(themes.map((theme) => theme.name)).toEqual(['班級經營']);
  });

  it('does not use category as LearningTheme card title when theme is mis-mapped', () => {
    const themes = buildLearningThemes([createQuestion({ category: '國小', learningTheme: '國小', knowledgeNode: '正向管教' })]);

    expect(themes.map((theme) => theme.name)).toEqual(['正向管教']);
  });
});

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'Q001',
    year: '113',
    category: '國小',
    subject: '教育原理',
    questionNumber: '1',
    type: CHOICE_QUESTION_TYPE,
    score: 2,
    group: overrides.learningTheme ?? '教學評量',
    learningTheme: '教學評量',
    knowledgeNode: '形成性評量',
    stem: '題幹',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
    ...overrides,
  };
}
