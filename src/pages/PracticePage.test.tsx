import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_QUESTION_COUNT_BY_TYPE,
  EssayPracticeCard,
  PracticeCountSelector,
  PracticeFilterSelector,
  PracticeTypeSelector,
  buildPracticeResultState,
  canUseRestoredPracticeSession,
  normalizePracticeFiltersForOptions,
  practiceCountOptions,
  sanitizeCustomQuestionCount,
  selectPracticeQuestions,
  updatePracticeSessionEssayCompletion,
} from './PracticePage';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from '../services/questionBankFields';
import type { PracticeSession } from '../types/PracticeSession';
import type { SmartFeedbackResult } from '../types/SmartFeedback';
import type { Question } from '../types/question';

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

    expect(html).toContain('1');
    expect(html).toContain('5');
    expect(html).toContain('10');
    expect(html).toContain('25');
    expect(html).not.toContain('20');
  });

  it('renders all years first before newest-to-oldest year options', () => {
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        typeFilter="choice"
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

  it('disables wrong-question options for essay practice', () => {
    const choiceHtml = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        typeFilter="choice"
        options={{ years: [], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );
    const essayHtml = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        typeFilter="essay"
        options={{ years: [], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );

    expect(choiceHtml).toContain('value="wrongOnly"');
    expect(choiceHtml).toContain('value="wrongElimination"');
    expect(choiceHtml).not.toContain('value="wrongOnly" disabled');
    expect(choiceHtml).not.toContain('value="wrongElimination" disabled');
    expect(essayHtml).toContain('value="wrongOnly" disabled');
    expect(essayHtml).toContain('value="wrongElimination" disabled');
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

  it('resets an invalid core concept after year and subject filter options change', () => {
    const normalizedFilters = normalizePracticeFiltersForOptions(
      { year: '114', subject: '教育理念與實務', coreConcept: 'Piaget', wrongQuestion: 'all' },
      [
        createQuestion('Q1', { year: '113', subject: '教育理念與實務', coreConcept: 'Piaget' }),
        createQuestion('Q2', { year: '114', subject: '教育理念與實務', coreConcept: '形成性評量' }),
      ],
    );

    expect(normalizedFilters.coreConcept).toBe('');
  });

  it('custom question count is clamped to the eligible range', () => {
    expect(sanitizeCustomQuestionCount(0, 10)).toBe(1);
    expect(sanitizeCustomQuestionCount(99, 7)).toBe(7);
    expect(sanitizeCustomQuestionCount(20, 25)).toBe(20);
  });

  it('uses sensible default question counts by type', () => {
    expect(DEFAULT_QUESTION_COUNT_BY_TYPE.choice).toBe(5);
    expect(DEFAULT_QUESTION_COUNT_BY_TYPE.essay).toBe(1);
  });

  it('restores a valid session only for normal choice practice', () => {
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'choice', false)).toBe(true);
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'essay', false)).toBe(false);
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'choice', true)).toBe(false);
  });

  it('does not restore a session when the selected question count changes', () => {
    expect(
      canUseRestoredPracticeSession(
        createSession(),
        [createQuestion('Q1'), createQuestion('Q2'), createQuestion('Q3')],
        'choice',
        false,
        [createQuestion('Q1'), createQuestion('Q2'), createQuestion('Q3')],
        3,
      ),
    ).toBe(false);
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
    expect(html).not.toContain('作答回饋參考');
  });

  it('shows feedback first and only one reference answer block after essay submit', () => {
    const html = renderToStaticMarkup(
      <EssayPracticeCard
        answer="我的答案"
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

  it('builds essay result state from average smart feedback levels', () => {
    const result = buildPracticeResultState({
      questions: [createEssayQuestion('E1'), createEssayQuestion('E2')],
      answers: [],
      essayFeedback: {
        E1: createFeedback(4),
        E2: createFeedback(2),
      },
      questionType: 'essay',
    });

    expect(result).toEqual({
      totalCount: 2,
      correctCount: 0,
      wrongCount: 0,
      gradableCount: 0,
      questionType: ESSAY_QUESTION_TYPE,
      averageFeedbackLevel: 3,
    });
  });

  it('builds choice result state without essay feedback average', () => {
    const result = buildPracticeResultState({
      questions: [createQuestion('C1'), createQuestion('C2')],
      answers: [
        { questionId: 'C1', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true },
        { questionId: 'C2', selectedAnswer: 'B', correctAnswer: 'A', isCorrect: false },
      ],
      essayFeedback: {},
      questionType: 'choice',
    });

    expect(result).toEqual({
      totalCount: 2,
      correctCount: 1,
      wrongCount: 1,
      gradableCount: 2,
      questionType: CHOICE_QUESTION_TYPE,
    });
  });

  it('does not count the same completed essay question twice', () => {
    const firstSession = updatePracticeSessionEssayCompletion(createSession(), 'E1');
    const secondSession = updatePracticeSessionEssayCompletion(firstSession, 'E1');

    expect(firstSession.completedEssayCount).toBe(1);
    expect(firstSession.completedEssayQuestionIds).toEqual(['E1']);
    expect(secondSession).toBe(firstSession);
    expect(secondSession.completedEssayCount).toBe(1);
    expect(secondSession.completedEssayQuestionIds).toEqual(['E1']);
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

function createEssayQuestion(id = 'E1'): Question {
  return {
    ...createQuestion(id),
    type: ESSAY_QUESTION_TYPE,
    score: 10,
    essayReferenceAnswer: '非選參考答案內容',
  };
}

function createFeedback(level: 1 | 2 | 3 | 4 | 5 = 4): SmartFeedbackResult {
  return {
    level,
    summary: '已有核心概念。',
    coveredConcepts: [],
    missingConcepts: [],
    matchedBonusConcepts: [],
    suggestedBonusConcepts: [],
  };
}
