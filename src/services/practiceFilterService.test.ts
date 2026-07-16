import { describe, expect, it } from 'vitest';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';
import {
  DEFAULT_PRACTICE_FILTERS,
  buildPracticeFilterOptions,
  buildPracticeFilterOptionsForFilters,
  filterPracticeQuestions,
  isWrongQuestion,
  sortCoreConcepts,
} from './practiceFilterService';

describe('practiceFilterService', () => {
  it('sorts year options by newest exam year first while preserving session years', () => {
    const questions = [
      createQuestion({ id: 'Q1', year: '106' }),
      createQuestion({ id: 'Q2', year: '115' }),
      createQuestion({ id: 'Q3', year: '108-1' }),
      createQuestion({ id: 'Q4', year: '108-2' }),
      createQuestion({ id: 'Q5', year: '109' }),
      createQuestion({ id: 'Q6', year: '94' }),
      createQuestion({ id: 'Q7', year: '115' }),
      createQuestion({ id: 'Q8', year: '' }),
    ];

    expect(buildPracticeFilterOptionsForFilters(questions, { year: '', subject: '' }).years).toEqual([
      '115',
      '109',
      '108-2',
      '108-1',
      '106',
      '94',
    ]);
    expect(buildPracticeFilterOptionsForFilters(questions, { year: '', subject: '' }).years).not.toContain('107');
  });

  it('sorts core concepts with English-leading concepts before Chinese concepts', () => {
    expect(
      sortCoreConcepts([
        '文化融合意象',
        'Piaget',
        ' ',
        'A10 理論',
        'ABC 理論',
        '「Bandura」',
        'A2 理論',
        '三明治溝通法',
        'ABC 理論',
        '(Albert Bandura)',
      ]),
    ).toEqual([
      'A2 理論',
      'A10 理論',
      'ABC 理論',
      '(Albert Bandura)',
      '「Bandura」',
      'Piaget',
      '三明治溝通法',
      '文化融合意象',
    ]);
  });

  it('builds core concept options from the active year and subject filters', () => {
    const questions = [
      createQuestion({ id: 'Q1', year: '113', subject: '教育理念與實務', coreConcept: 'Piaget' }),
      createQuestion({ id: 'Q2', year: '113', subject: '教育理念與實務', coreConcept: '三明治溝通法' }),
      createQuestion({ id: 'Q3', year: '113', subject: '國語文能力測驗', coreConcept: '文化融合意象' }),
      createQuestion({ id: 'Q4', year: '114', subject: '教育理念與實務', coreConcept: 'ABC 理論' }),
    ];

    expect(buildPracticeFilterOptionsForFilters(questions, { year: '113', subject: '教育理念與實務' }).coreConcepts).toEqual([
      'Piaget',
      '三明治溝通法',
    ]);
  });

  it('sorts subject options by JLS subject order and keeps only existing subjects', () => {
    const questions = [
      createQuestion({ id: 'Q1', year: '113', subject: '國語文能力測驗' }),
      createQuestion({ id: 'Q2', year: '113', subject: '教育原理與制度' }),
      createQuestion({ id: 'Q3', year: '113', subject: '青少年發展與輔導' }),
      createQuestion({ id: 'Q4', year: '113', subject: '中等學校課程與教學' }),
      createQuestion({ id: 'Q5', year: '113', subject: '未分類科目' }),
      createQuestion({ id: 'Q6', year: '114', subject: '教育原理與制度' }),
      createQuestion({ id: 'Q7', year: '113', subject: '教育原理與制度' }),
      createQuestion({ id: 'Q8', year: '113', subject: '' }),
    ];

    expect(buildPracticeFilterOptions(questions, '113').subjects).toEqual([
      '中等學校課程與教學',
      '青少年發展與輔導',
      '教育原理與制度',
      '未分類科目',
      '國語文能力測驗',
    ]);
    expect(buildPracticeFilterOptions(questions, '114').subjects).toEqual(['教育原理與制度']);
  });

  it('filters practice questions by year, subject, core concept, and type as an intersection', () => {
    const questions = [
      createQuestion({ id: 'Q1', year: '113', subject: '教育評量', coreConcept: '形成性評量', type: '選擇題' }),
      createQuestion({ id: 'Q2', year: '113', subject: '教育評量', coreConcept: '正向管教', type: '選擇題' }),
      createQuestion({ id: 'Q3', year: '112', subject: '教育評量', coreConcept: '形成性評量', type: '選擇題' }),
      createQuestion({ id: 'Q4', year: '113', subject: '教育評量', coreConcept: '形成性評量', type: '非選題' }),
    ];

    const result = filterPracticeQuestions(
      questions,
      {
        ...DEFAULT_PRACTICE_FILTERS,
        year: '113',
        subject: '教育評量',
        coreConcept: '形成性評量',
      },
      'choice',
    );

    expect(result.map((question) => question.id)).toEqual(['Q1']);
  });

  it('filters session exam years by exact string without merging the same main year', () => {
    const questions = [
      createQuestion({ id: 'Q1', year: '108-1', subject: '教育評量', coreConcept: '形成性評量', type: '選擇題' }),
      createQuestion({ id: 'Q2', year: '108-2', subject: '教育評量', coreConcept: '形成性評量', type: '選擇題' }),
      createQuestion({ id: 'Q3', year: '108-1', subject: '教育評量', coreConcept: '形成性評量', type: '非選題' }),
    ];

    expect(
      filterPracticeQuestions(questions, { ...DEFAULT_PRACTICE_FILTERS, year: '108-1' }, 'choice').map(
        (question) => question.id,
      ),
    ).toEqual(['Q1']);
    expect(
      filterPracticeQuestions(questions, { ...DEFAULT_PRACTICE_FILTERS, year: '108-2' }, 'choice').map(
        (question) => question.id,
      ),
    ).toEqual(['Q2']);
  });

  it('detects wrong questions from CSV correctness, CSV wrong count, or LearningRecord', () => {
    expect(isWrongQuestion(createQuestion({ isCorrect: '否' }))).toBe(true);
    expect(isWrongQuestion(createQuestion({ wrongCount: '2' }))).toBe(true);
    expect(isWrongQuestion(createQuestion(), createLearningRecord({ wrongCount: 1 }))).toBe(true);
    expect(isWrongQuestion(createQuestion({ isCorrect: '是', wrongCount: '0' }), createLearningRecord({ wrongCount: 0 }))).toBe(
      false,
    );
  });

  it('keeps only wrong questions when wrong-only filter is enabled', () => {
    const questions = [
      createQuestion({ id: 'Q1', isCorrect: '是', wrongCount: '0' }),
      createQuestion({ id: 'Q2', isCorrect: '否', wrongCount: '0' }),
      createQuestion({ id: 'Q3', isCorrect: '是', wrongCount: '0' }),
    ];

    const result = filterPracticeQuestions(
      questions,
      { ...DEFAULT_PRACTICE_FILTERS, wrongQuestion: 'wrongOnly' },
      'choice',
      { Q3: createLearningRecord({ questionId: 'Q3', wrongCount: 2 }) },
    );

    expect(result.map((question) => question.id)).toEqual(['Q2', 'Q3']);
  });
});

function createQuestion(overrides: Partial<Question> = {}): Question {
  const coreConcept = overrides.coreConcept ?? overrides.knowledgeNode ?? '形成性評量';

  return {
    id: 'Q1',
    year: '113',
    category: '國小',
    subject: '教育評量',
    questionNumber: '1',
    type: '選擇題',
    score: 2,
    group: '教學評量',
    learningTheme: '教學評量',
    coreConcept,
    knowledgeNode: coreConcept,
    stem: '形成性評量的主要目的為何？',
    optionA: '排名學生',
    optionB: '調整教學',
    optionC: '取代作業',
    optionD: '只評記憶',
    correctAnswer: 'B',
    wrongCount: '0',
    isCorrect: '',
    ...overrides,
  };
}

function createLearningRecord(overrides: Partial<LearningRecord> = {}): LearningRecord {
  return {
    id: '教學評量::形成性評量',
    learningTheme: '教學評量',
    knowledgeNode: '形成性評量',
    mastery: 0,
    masteredCount: 0,
    missingCount: 0,
    recentMissing: [],
    updatedAt: '2026-07-11T00:00:00.000Z',
    questionId: 'Q1',
    lastCorrect: false,
    correctCount: 0,
    wrongCount: 0,
    familiarity: 0,
    reviewCount: 0,
    viewedAI: false,
    ...overrides,
  };
}
