import { describe, expect, it } from 'vitest';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from './questionBankFields';
import {
  buildQuestionBookFilterOptions,
  buildQuestionBookPdfModel,
  buildQuestionBookTitleFilterText,
  createInitialQuestionBookFilters,
  filterQuestionBookQuestions,
} from './questionBookExportService';
import { filterPracticeQuestions, DEFAULT_PRACTICE_FILTERS } from './practiceFilterService';
import { getAllFilterValue } from './wrongQuestionExportService';
import type { Question } from '../types/question';

describe('questionBookExportService', () => {
  it('filters by year, subject, and learning theme without using wrong-question records', () => {
    const questions = [
      createQuestion({ id: 'q1', year: '115', subject: '教育原理與制度', learningTheme: '課程理論' }),
      createQuestion({ id: 'q2', year: '114', subject: '教育原理與制度', learningTheme: '課程理論', wrongCount: '0' }),
      createQuestion({ id: 'q3', year: '115', subject: '青少年發展與輔導', learningTheme: '輔導理論', wrongCount: '0' }),
      createQuestion({ id: 'q4', year: '115', subject: '教育原理與制度', learningTheme: '測驗理論', wrongCount: '0' }),
    ];

    const result = filterQuestionBookQuestions(questions, {
      ...createInitialQuestionBookFilters(),
      year: '115',
      subject: '教育原理與制度',
      learningTheme: '課程理論',
    });

    expect(result.map((item) => item.question.id)).toEqual(['q1']);
  });

  it('uses the same search matching behavior as Practice, including blank and multi-keyword searches', () => {
    const questions = [
      createQuestion({ id: 'q1', year: '115', stem: 'Piaget cognitive development', optionA: 'schema' }),
      createQuestion({ id: 'q2', year: '114', stem: 'Vygotsky social learning', optionA: 'scaffold' }),
    ];
    const filters = { ...createInitialQuestionBookFilters(), searchQuery: 'Piaget schema' };
    const practiceFilters = { ...DEFAULT_PRACTICE_FILTERS, searchQuery: filters.searchQuery };

    expect(filterQuestionBookQuestions(questions, filters).map((item) => item.question.id)).toEqual(
      filterPracticeQuestions(questions, practiceFilters, 'choice').map((question) => question.id),
    );
    expect(filterQuestionBookQuestions(questions, { ...filters, searchQuery: '' })).toHaveLength(2);
    expect(filterQuestionBookQuestions(questions, { ...filters, searchQuery: 'Piaget missing' })).toHaveLength(0);
  });

  it('builds hierarchical filter options from the current upstream selections', () => {
    const questions = [
      createQuestion({ id: 'q1', year: '115', subject: '教育原理與制度', learningTheme: '課程理論' }),
      createQuestion({ id: 'q2', year: '115', subject: '青少年發展與輔導', learningTheme: '輔導理論' }),
      createQuestion({ id: 'q3', year: '114', subject: '教育原理與制度', learningTheme: '測驗理論' }),
    ];

    const options = buildQuestionBookFilterOptions(questions, {
      year: '115',
      subject: '教育原理與制度',
    });

    expect(options.years).toContain('114');
    expect(options.subjects).toEqual([getAllFilterValue(), '青少年發展與輔導', '教育原理與制度']);
    expect(options.learningThemes).toEqual([getAllFilterValue(), '課程理論']);
  });

  it('builds question-book PDF title filters from applied filters only', () => {
    const all = getAllFilterValue();
    const baseFilters = createInitialQuestionBookFilters();

    expect(buildQuestionBookTitleFilterText(baseFilters)).toBe('');
    expect(buildQuestionBookTitleFilterText({ ...baseFilters, year: '113' })).toBe('主題：113年');
    expect(buildQuestionBookTitleFilterText({ ...baseFilters, year: '113', subject: '教育原理與制度' })).toBe('主題：113年・教育原理與制度');
    expect(buildQuestionBookTitleFilterText({ ...baseFilters, year: '113', subject: '教育原理與制度', learningTheme: '認知發展' })).toBe('主題：113年・教育原理與制度・認知發展');
    expect(buildQuestionBookTitleFilterText({ ...baseFilters, year: '113', subject: '教育原理與制度', searchQuery: '  皮亞傑   認知  ' })).toBe('主題：113年・教育原理與制度・皮亞傑 認知');
    expect(buildQuestionBookTitleFilterText({ year: all, subject: all, learningTheme: all, searchQuery: '' })).toBe('');
  });

  it('adds applied question-book filters to the PDF title without changing the filename', () => {
    const model = buildQuestionBookPdfModel({
      displayName: 'Jimmy',
      now: new Date('2026-08-22T10:00:00'),
      filters: {
        ...createInitialQuestionBookFilters(),
        year: '113',
        subject: '教育原理與制度',
        learningTheme: '認知發展',
        searchQuery: '皮亞傑',
      },
      items: [{ question: createQuestion({ id: 'q1' }) }],
    });

    expect(model.titleText).toBe('Jimmy的試題本');
    expect(model.titleFilterText).toBe('主題：113年・教育原理與制度・認知發展・皮亞傑');
    expect(model.title).toBe('Jimmy的試題本 主題：113年・教育原理與制度・認知發展・皮亞傑 08/22');
    expect(model.fileName).toBe('Jimmy_試題本_2026-08-22.pdf');
  });
  it('builds question-book PDF metadata with wrong-question PDF line structure and image-backed items', () => {
    const model = buildQuestionBookPdfModel({
      displayName: 'Jimmy',
      now: new Date('2026-08-22T10:00:00'),
      items: [{
        question: createQuestion({
          id: 'q1',
          stemImage: 'jls-question-image:stem',
          optionAImage: 'jls-question-image:a',
        }),
      }],
    });

    expect(model.titleText).toBe('Jimmy的試題本');
    expect(model.title).toBe('Jimmy的試題本 08/22');
    expect(model.analysisTitleText).toBe('試題本解析');
    expect(model.fileName).toBe('Jimmy_試題本_2026-08-22.pdf');
    expect(model.questionLines).toEqual([
      '【115年 教育原理與制度 第1題】',
      '1. 題幹',
      '(A) 選項A',
      '(B) 選項B',
      '(C) 選項C',
      '(D) 選項D',
      '',
    ]);
    expect(model.analysisLines[0]).toBe('1. 答案：(B)');
    expect(model.items[0].question.stemImage).toBe('jls-question-image:stem');
    expect(model.items[0].question.optionAImage).toBe('jls-question-image:a');
  });

  it('deduplicates only consecutive repeated stem images in question-book PDF models', () => {
    const consecutive = buildQuestionBookPdfModel({
      displayName: 'Jimmy',
      items: [
        { question: createQuestion({ id: 'q5', questionNumber: '5', stemImage: 'jls-question-image:X' }) },
        { question: createQuestion({ id: 'q6', questionNumber: '6', stemImage: 'jls-question-image:X' }) },
        { question: createQuestion({ id: 'q7', questionNumber: '7', stemImage: 'jls-question-image:X' }) },
      ],
    });
    const separated = buildQuestionBookPdfModel({
      displayName: 'Jimmy',
      items: [
        { question: createQuestion({ id: 'q5', questionNumber: '5', stemImage: 'jls-question-image:X' }) },
        { question: createQuestion({ id: 'q6', questionNumber: '6', stemImage: 'jls-question-image:X' }) },
        { question: createQuestion({ id: 'q7', questionNumber: '7', stemImage: 'jls-question-image:Y' }) },
        { question: createQuestion({ id: 'q8', questionNumber: '8', stemImage: 'jls-question-image:X' }) },
      ],
    });

    expect(consecutive.items.map((item) => item.question.stemImage)).toEqual(['jls-question-image:X', '', '']);
    expect(separated.items.map((item) => item.question.stemImage)).toEqual(['jls-question-image:X', '', 'jls-question-image:Y', 'jls-question-image:X']);
  });
  it('limits exportable questions to the choice-question format supported by the shared PDF renderer', () => {
    const result = filterQuestionBookQuestions([
      createQuestion({ id: 'choice' }),
      createQuestion({ id: 'essay', type: ESSAY_QUESTION_TYPE }),
      createQuestion({ id: 'no-answer', correctAnswer: '' }),
    ], createInitialQuestionBookFilters());

    expect(result.map((item) => item.question.id)).toEqual(['choice']);
  });
});

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    year: '115',
    category: '中等學校',
    subject: '教育原理與制度',
    questionNumber: '1',
    type: CHOICE_QUESTION_TYPE,
    score: 2,
    group: '課程理論',
    learningTheme: '課程理論',
    knowledgeNode: '課程理論',
    stem: '題幹',
    optionA: '選項A',
    optionB: '選項B',
    optionC: '選項C',
    optionD: '選項D',
    correctAnswer: 'B',
    stemAnalysis: '題幹解析',
    optionAAnalysis: 'A解析',
    optionBAnalysis: 'B解析',
    optionCAnalysis: 'C解析',
    optionDAnalysis: 'D解析',
    solvingTechnique: '解題技巧',
    confusingConcepts: '易混淆概念',
    ...overrides,
  };
}
