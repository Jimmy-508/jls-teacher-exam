import { describe, expect, it } from 'vitest';
import type { LearningRecord } from '../types/LearningRecord';
import type { LearningTheme } from '../types/LearningTheme';
import type { PracticeSession } from '../types/PracticeSession';
import type { Question } from '../types/question';
import { CHOICE_QUESTION_TYPE } from './questionBankFields';
import {
  buildTodayViewModel,
  getDailyMotto,
  getGreeting,
  getLearningJourney,
  getThemeLearningStats,
  getTodayFocus,
  getTodayRecommendation,
  selectRelativelyHighWrongTheme,
} from './todayEngine';

const questions: Question[] = [
  createQuestion('q1', '教育理念與實務', '性別教育'),
  createQuestion('q2', '教育理念與實務', '性別教育'),
  createQuestion('q3', '課程教學與評量', '形成性評量'),
  createQuestion('q4', '學習者發展與適性輔導', '認知策略'),
];

const themes: LearningTheme[] = [
  createTheme('theme-a', '教育理念與實務', '性別教育', ['q1', 'q2'], 2),
  createTheme('theme-b', '課程教學與評量', '形成性評量', ['q3'], 1),
  createTheme('theme-c', '學習者發展與適性輔導', '認知策略', ['q4'], 3),
];

describe('todayEngine', () => {
  it('returns greeting by day period and falls back to Jarvis', () => {
    expect(getGreeting('Allen', new Date('2026-07-06T08:00:00+08:00'))).toBe('Good Morning, Allen.');
    expect(getGreeting('Allen', new Date('2026-07-06T13:00:00+08:00'))).toBe('Good Afternoon, Allen.');
    expect(getGreeting('Allen', new Date('2026-07-06T20:00:00+08:00'))).toBe('Good Evening, Allen.');
    expect(getGreeting('', new Date('2026-07-06T08:00:00+08:00'))).toBe('Good Morning, Jarvis.');
  });

  it('returns one Today focus from least practiced themes', () => {
    const records: LearningRecord[] = [
      createRecord('q1', 3, 0, 4),
      createRecord('q2', 3, 0, 4),
      createRecord('q3', 1, 0, 3),
    ];
    const focus = getTodayFocus(questions, records, themes, () => 0);

    expect(focus).not.toBeNull();
    expect(focus?.learningThemeName).toBe('認知策略');
    expect(focus?.reason).toBe('尚未練習');
  });

  it('uses lower familiarity and then higher wrong count when practice counts tie', () => {
    const tiedThemes = [
      createTheme('theme-a', '教育理念與實務', '主題甲', ['q1'], 3),
      createTheme('theme-b', '課程教學與評量', '主題乙', ['q3'], 1),
    ];
    const records: LearningRecord[] = [createRecord('q1', 1, 0, 3), createRecord('q3', 1, 0, 1)];
    const focus = getTodayFocus(questions, records, tiedThemes, () => 0);

    expect(focus?.learningThemeName).toBe('主題乙');
    expect(focus?.reason).toBe('目前練習次數最少');
  });

  it('can select another low-practice focus candidate with injected randomness', () => {
    const focus = getTodayFocus(questions, [], themes, () => 0.99);

    expect(focus?.learningThemeName).toBe('認知策略');
  });

  it('selects Today recommendation from relatively high wrong-count themes', () => {
    const recommendationThemes = [
      createTheme('theme-a', '教育理念與實務', '性別教育', ['q1'], 2),
      createTheme('theme-b', '課程教學與評量', '形成性評量', ['q3'], 2),
      createTheme('theme-c', '學習者發展與適性輔導', '認知策略', ['q4'], 2),
    ];
    const records: LearningRecord[] = [
      createRecord('q1', 0, 8, 2),
      createRecord('q3', 0, 7, 2),
      createRecord('q4', 0, 6, 2),
    ];

    const firstRecommendation = getTodayRecommendation(null, recommendationThemes, records, () => 0);
    const alternateRecommendation = getTodayRecommendation(null, recommendationThemes, records, () => 0.99);

    expect(firstRecommendation?.title).toBe('優先複習：性別教育');
    expect(firstRecommendation?.description).toBe('這是目前累積錯誤次數較高的學習主題，建議再練習一次。');
    expect(alternateRecommendation?.targetKnowledgeNode).toBe('認知策略');
  });

  it('selects a reasonable recommendation when every wrong count is zero', () => {
    const recommendation = getTodayRecommendation(null, themes, [], () => 0);

    expect(recommendation?.title).toBe('建議練習：性別教育');
    expect(recommendation?.targetQuestionIds).toEqual(['q1', 'q2']);
  });

  it('allows recommendation to be the same theme as Today focus', () => {
    const records: LearningRecord[] = [
      createRecord('q1', 0, 2, 1),
      createRecord('q2', 0, 2, 1),
      createRecord('q3', 10, 1, 3),
    ];
    const focus = getTodayFocus(questions, records, themes, () => 0);
    const recommendation = getTodayRecommendation(focus, themes, records, () => 0);

    expect(focus?.learningThemeName).toBe('認知策略');
    expect(recommendation?.targetKnowledgeNode).toBe('性別教育');
  });

  it('exposes theme learning stats from question records', () => {
    const stats = getThemeLearningStats(themes[0], [createRecord('q1', 2, 3, 2), createRecord('q2', 4, 1, 3)]);

    expect(stats.practiceCount).toBe(10);
    expect(stats.wrongCount).toBe(4);
    expect(stats.averageFamiliarity).toBe(2);
  });

  it('selectRelativelyHighWrongTheme uses the high-wrong candidate pool', () => {
    const candidates = [
      { theme: themes[0], stats: { practiceCount: 10, wrongCount: 8, averageFamiliarity: 2, lastReviewTime: 0 } },
      { theme: themes[1], stats: { practiceCount: 10, wrongCount: 7, averageFamiliarity: 2, lastReviewTime: 0 } },
      { theme: themes[2], stats: { practiceCount: 10, wrongCount: 6, averageFamiliarity: 2, lastReviewTime: 0 } },
    ];

    expect(selectRelativelyHighWrongTheme(candidates, () => 0.99).theme.name).toBe('認知策略');
  });

  it('keeps the same DailyMotto for the same date', () => {
    const morningMotto = getDailyMotto(new Date('2026-07-06T08:00:00+08:00'));
    const eveningMotto = getDailyMotto(new Date('2026-07-06T21:00:00+08:00'));

    expect(morningMotto).toEqual(eveningMotto);
  });

  it('builds TodayViewModel with focus, journey, and recommendation', () => {
    const records: LearningRecord[] = [createRecord('q1', 1, 1, 2)];
    const viewModel = buildTodayViewModel({
      questions,
      learningRecords: records,
      practiceSessions: [createSession()],
      knowledgeNodes: [],
      learningThemes: themes,
      learningInsights: [],
      recommendations: [],
      displayName: 'Jarvis',
      date: new Date('2026-07-06T20:00:00+08:00'),
      random: () => 0,
    });

    expect(viewModel.greeting).toBe('Good Evening, Jarvis.');
    expect(viewModel.focus).not.toBeNull();
    expect(viewModel.journey.answeredToday).toBe(1);
    expect(viewModel.recommendation).not.toBeNull();
  });

  it('returns one Learning Journey model for today', () => {
    const journey = getLearningJourney([createSession()], themes, new Date('2026-07-06T12:00:00+08:00'));

    expect(journey.items.length).toBeGreaterThan(0);
    expect(journey.answeredToday).toBe(1);
  });

  it('keeps existing choice-only journey statistics unchanged', () => {
    const journey = getLearningJourney([createSession()], themes, new Date('2026-07-06T12:00:00+08:00'));

    expect(journey.answeredToday).toBe(1);
    expect(journey.correctToday).toBe(1);
    expect(journey.wrongToday).toBe(0);
    expect(journey.accuracyToday).toBe(100);
    expect(journey.items).toEqual([
      expect.objectContaining({ label: '今日作答', value: '1 題' }),
      expect.objectContaining({ label: '選擇題正確率', value: '+100%' }),
    ]);
  });

  it('counts completed essay practice without showing not-started state', () => {
    const journey = getLearningJourney([createEssaySession(['q4'])], themes, new Date('2026-07-06T12:00:00+08:00'));

    expect(journey.answeredToday).toBe(1);
    expect(journey.correctToday).toBe(0);
    expect(journey.wrongToday).toBe(0);
    expect(journey.accuracyToday).toBe(0);
    expect(journey.items).toEqual([
      expect.objectContaining({ label: '今日作答', value: '1 題' }),
      expect.objectContaining({ label: '練習類型', value: '非選題' }),
    ]);
    expect(journey.items.some((item) => item.label === '尚未開始')).toBe(false);
    expect(journey.items.some((item) => item.label.includes('正確率'))).toBe(false);
  });

  it('keeps essay practice out of choice accuracy denominator', () => {
    const choiceSession = createSession({
      correctCount: 2,
      wrongCount: 1,
      answers: [
        { questionId: 'q1', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true },
        { questionId: 'q2', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true },
        { questionId: 'q3', selectedAnswer: 'B', correctAnswer: 'A', isCorrect: false },
      ],
      questionIds: ['q1', 'q2', 'q3'],
      totalQuestions: 3,
    });
    const essaySession = createEssaySession(['q4', 'q5']);
    const journey = getLearningJourney([choiceSession, essaySession], themes, new Date('2026-07-06T12:00:00+08:00'));

    expect(journey.answeredToday).toBe(5);
    expect(journey.correctToday).toBe(2);
    expect(journey.wrongToday).toBe(1);
    expect(journey.accuracyToday).toBe(67);
    expect(journey.items).toEqual([
      expect.objectContaining({ label: '今日作答', value: '5 題' }),
      expect.objectContaining({ label: '選擇題正確率', value: '+67%' }),
      expect.objectContaining({ label: '其中非選題', value: '2 題' }),
    ]);
  });

  it('does not count an essay session until an essay answer is submitted', () => {
    const journey = getLearningJourney(
      [createEssaySession([], { questionIds: ['q4'], totalQuestions: 1 })],
      themes,
      new Date('2026-07-06T12:00:00+08:00'),
    );

    expect(journey.answeredToday).toBe(0);
    expect(journey.items).toEqual([
      expect.objectContaining({
        label: '尚未開始',
        value: '完成一題練習後，JLS 會在這裡整理今日學習軌跡。',
      }),
    ]);
  });
});

function createQuestion(id: string, subject: string, learningTheme: string): Question {
  return {
    id,
    year: '113',
    category: 'teacher',
    subject,
    questionNumber: id,
    type: CHOICE_QUESTION_TYPE,
    score: 2,
    group: learningTheme,
    learningTheme,
    knowledgeNode: learningTheme,
    stem: '題幹',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
  };
}

function createTheme(
  id: string,
  subject: string,
  name: string,
  questionIds: string[],
  averageFamiliarity: number,
): LearningTheme {
  return {
    id,
    subject,
    name,
    questionIds,
    knowledgeNodeIds: questionIds.map((questionId) => `${questionId}-node`),
    questionCount: questionIds.length,
    choiceQuestionCount: questionIds.length,
    essayQuestionCount: 0,
    wrongCount: 0,
    averageFamiliarity,
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
    lastReview: '2026-07-01T00:00:00.000Z',
    viewedAI: false,
  };
}

function createSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'session-1',
    startTime: '2026-07-06T09:00:00.000Z',
    totalQuestions: 1,
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    durationSeconds: 60,
    questionType: CHOICE_QUESTION_TYPE,
    questionIds: ['q1'],
    currentIndex: 0,
    answers: [
      {
        questionId: 'q1',
        selectedAnswer: 'A',
        correctAnswer: 'A',
        isCorrect: true,
      },
    ],
    status: 'completed',
    ...overrides,
  };
}

function createEssaySession(completedEssayQuestionIds: string[], overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    ...createSession({
      id: 'essay-session',
      totalQuestions: Math.max(completedEssayQuestionIds.length, 1),
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
      questionIds: completedEssayQuestionIds.length > 0 ? completedEssayQuestionIds : ['q4'],
      answers: [],
      completedEssayQuestionIds,
      completedEssayCount: completedEssayQuestionIds.length,
      ...overrides,
    }),
  };
}
