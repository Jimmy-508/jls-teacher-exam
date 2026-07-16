import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  EssayPracticeCard,
  DEFAULT_QUESTION_COUNT_BY_TYPE,
  PracticeCountSelector,
  PracticeFilterSelector,
  PracticeTypeSelector,
  canUseRestoredPracticeSession,
  normalizePracticeFiltersForOptions,
  practiceCountOptions,
  sanitizeCustomQuestionCount,
  selectPracticeQuestions,
} from './PracticePage';
import type { PracticeSession } from '../types/PracticeSession';
import type { Question } from '../types/question';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from '../services/questionBankFields';
import type { SmartFeedbackResult } from '../types/SmartFeedback';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: undefined }),
  useNavigate: () => vi.fn(),
}));

describe('PracticePage controls', () => {
  it('shows only choice and essay question type selector options', () => {
    const html = renderToStaticMarkup(<PracticeTypeSelector value="choice" onChange={() => undefined} />);

    expect(html).toContain('choice');
    expect(html).toContain('essay');
    expect(html).not.toContain('all');
  });

  it('shows custom question count option and input', () => {
    const html = renderToStaticMarkup(
      <PracticeCountSelector
        maxCount={12}
        mode="custom"
        value={8}
        onChange={() => undefined}
        onModeChange={() => undefined}
      />,
    );

    expect(html).toContain('value="custom"');
    expect(html).toContain('type="number"');
    expect(html).toContain('自訂');
    expect(html).not.toContain('使用者自訂');
  });

  it('shows simplified preset question count options', () => {
    expect(practiceCountOptions).toEqual([1, 5, 10, 25]);

    const html = renderToStaticMarkup(
      <PracticeCountSelector
        maxCount={25}
        mode="preset"
        value={5}
        onChange={() => undefined}
        onModeChange={() => undefined}
      />,
    );

    expect(html).toContain('1 題');
    expect(html).toContain('5 題');
    expect(html).toContain('10 題');
    expect(html).toContain('25 題');
    expect(html).not.toContain('20 題');
  });

  it('renders subject options with all subjects first and Chinese language last', () => {
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        options={{
          years: ['113'],
          subjects: ['中等學校課程與教學', '青少年發展與輔導', '教育原理與制度', '國語文能力測驗'],
          coreConcepts: ['形成性評量'],
        }}
        onChange={() => undefined}
      />,
    );

    expect(html.indexOf('全部科目')).toBeLessThan(html.indexOf('中等學校課程與教學'));
    expect(html.indexOf('中等學校課程與教學')).toBeLessThan(html.indexOf('青少年發展與輔導'));
    expect(html.indexOf('青少年發展與輔導')).toBeLessThan(html.indexOf('教育原理與制度'));
    expect(html.indexOf('教育原理與制度')).toBeLessThan(html.indexOf('國語文能力測驗'));
  });

  it('renders all years first before newest-to-oldest year options', () => {
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        options={{
          years: ['115', '114', '113'],
          subjects: [],
          coreConcepts: [],
        }}
        onChange={() => undefined}
      />,
    );

    expect(html.indexOf('value=""')).toBeLessThan(html.indexOf('115'));
    expect(html.indexOf('115')).toBeLessThan(html.indexOf('114'));
    expect(html.indexOf('114')).toBeLessThan(html.indexOf('113'));
  });

  it('resets an invalid subject after year-filtered subject options change', () => {
    const normalizedFilters = normalizePracticeFiltersForOptions(
      { year: '114', subject: '國語文能力測驗', coreConcept: '', wrongQuestion: 'all' },
      [
        createQuestion('Q1', { year: '113', subject: '國語文能力測驗' }),
        createQuestion('Q2', { year: '114', subject: '教育理念與實務' }),
      ],
    );

    expect(normalizedFilters.subject).toBe('');
  });

  it('renders all core concepts before sorted concept options', () => {
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        options={{
          years: [],
          subjects: [],
          coreConcepts: ['A2 theory', 'Piaget', '核心概念'],
        }}
        onChange={() => undefined}
      />,
    );

    expect(html.indexOf('全部核心概念')).toBeLessThan(html.indexOf('A2 theory'));
    expect(html.indexOf('A2 theory')).toBeLessThan(html.indexOf('Piaget'));
    expect(html.indexOf('Piaget')).toBeLessThan(html.indexOf('核心概念'));
  });

  it('resets an invalid core concept after year and subject filter options change', () => {
    const normalizedFilters = normalizePracticeFiltersForOptions(
      { year: '114', subject: '教育理念與實務', coreConcept: 'Piaget', wrongQuestion: 'all' },
      [
        createQuestion('Q1', { year: '113', subject: '教育理念與實務', coreConcept: 'Piaget' }),
        createQuestion('Q2', { year: '114', subject: '教育理念與實務', coreConcept: 'ABC 理論' }),
      ],
    );

    expect(normalizedFilters.coreConcept).toBe('');
  });

  it('custom question count is at least 1', () => {
    expect(sanitizeCustomQuestionCount(0, 10)).toBe(1);
  });

  it('custom question count cannot exceed eligible question count', () => {
    expect(sanitizeCustomQuestionCount(99, 7)).toBe(7);
  });

  it('custom question count can still accept 20 when it is within the eligible count', () => {
    expect(sanitizeCustomQuestionCount(20, 25)).toBe(20);
  });

  it('uses sensible default question counts by type', () => {
    expect(DEFAULT_QUESTION_COUNT_BY_TYPE.choice).toBe(5);
    expect(DEFAULT_QUESTION_COUNT_BY_TYPE.essay).toBe(1);
  });

  it('does not restore a session when switching to essay practice', () => {
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'essay', false)).toBe(false);
  });

  it('restores a valid session only for normal choice practice', () => {
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'choice', false)).toBe(true);
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'choice', true)).toBe(false);
  });

  it('keeps Knowledge questionIds as the practice scope when switching question types', () => {
    const loadedQuestions = [
      createQuestion('C1', { type: CHOICE_QUESTION_TYPE }),
      createQuestion('E1', { type: ESSAY_QUESTION_TYPE }),
      createQuestion('C2', { type: CHOICE_QUESTION_TYPE }),
      createQuestion('E2', { type: ESSAY_QUESTION_TYPE }),
    ];
    const requestedQuestionIds = ['C1', 'E1'];

    expect(
      selectPracticeQuestions({
        filteredQuestions: loadedQuestions,
        loadedQuestions,
        questionCount: 5,
        requestedQuestionIds,
        restoredSession: null,
        typeFilter: 'choice',
      }).map((question) => question.id),
    ).toEqual(['C1']);
    expect(
      selectPracticeQuestions({
        filteredQuestions: loadedQuestions,
        loadedQuestions,
        questionCount: 5,
        requestedQuestionIds,
        restoredSession: null,
        typeFilter: 'essay',
      }).map((question) => question.id),
    ).toEqual(['E1']);
  });

  it('shows reference answer before essay answer is submitted', () => {
    const html = renderToStaticMarkup(
      <EssayPracticeCard
        answer=""
        errorMessage=""
        isGeneratingFeedback={false}
        isLastQuestion={false}
        onAnswerChange={() => undefined}
        onNext={() => undefined}
        onSubmit={() => undefined}
        question={createEssayQuestion()}
      />,
    );

    expect(html).toContain('參考答案');
    expect(html).toContain('非選參考答案內容');
    expect(html).not.toContain('作答回饋');
  });

  it('shows feedback first and only one reference answer block after essay submit', () => {
    const html = renderToStaticMarkup(
      <EssayPracticeCard
        answer="我的作答"
        errorMessage=""
        feedback={createFeedback()}
        isGeneratingFeedback={false}
        isLastQuestion={false}
        onAnswerChange={() => undefined}
        onNext={() => undefined}
        onSubmit={() => undefined}
        question={createEssayQuestion()}
      />,
    );

    expect(html).toContain('作答回饋參考');
    expect(html.indexOf('作答回饋參考')).toBeLessThan(html.indexOf('參考答案'));
    expect(html.match(/參考答案/g)).toHaveLength(1);
  });
});

function createSession(): PracticeSession {
  return {
    id: 'session-1',
    startTime: '2026-07-07T00:00:00.000Z',
    totalQuestions: 1,
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    durationSeconds: 0,
    questionType: CHOICE_QUESTION_TYPE,
    questionIds: ['Q1'],
    currentIndex: 0,
    answers: [],
    status: 'active',
  };
}

function createQuestion(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    year: '113',
    category: 'teacher',
    subject: 'education',
    questionNumber: '1',
    type: CHOICE_QUESTION_TYPE,
    score: 1,
    group: 'theme',
    learningTheme: 'theme',
    knowledgeNode: 'node',
    stem: 'Question',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
    ...overrides,
  };
}

function createEssayQuestion(): Question {
  return {
    ...createQuestion('E1'),
    type: '非選題',
    score: 10,
    essayReferenceAnswer: '非選參考答案內容',
  };
}

function createFeedback(): SmartFeedbackResult {
  return {
    level: 4,
    summary: '方向正確。',
    coveredConcepts: [],
    missingConcepts: [],
    matchedBonusConcepts: [],
    suggestedBonusConcepts: [],
  };
}
