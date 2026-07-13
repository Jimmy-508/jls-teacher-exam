import { describe, expect, it } from 'vitest';
import { buildLearningThemes } from './learningThemeService';
import {
  buildTodayViewModel,
  getDailyMotto,
  getGreeting,
  getLearningJourney,
  getTodayFocus,
  getTodayRecommendation,
} from './todayEngine';
import type { LearningRecord } from '../types/LearningRecord';
import type { PracticeSession } from '../types/PracticeSession';
import type { Question } from '../types/question';

const questions: Question[] = [
  createQuestion('q1', '教學評量', '形成性評量'),
  createQuestion('q2', '教學評量', '信度'),
  createQuestion('q3', '課程教學', '校本課程'),
  createQuestion('q4', '課程教學', '鷹架理論'),
];

describe('todayEngine', () => {
  it('returns Good Morning in the morning', () => {
    expect(getGreeting('Allen', new Date('2026-07-06T08:00:00+08:00'))).toBe('Good Morning, Allen.');
  });

  it('returns Good Afternoon in the afternoon', () => {
    expect(getGreeting('Allen', new Date('2026-07-06T13:00:00+08:00'))).toBe('Good Afternoon, Allen.');
  });

  it('returns Good Evening in the evening', () => {
    expect(getGreeting('Allen', new Date('2026-07-06T20:00:00+08:00'))).toBe('Good Evening, Allen.');
  });

  it('replaces Jimmy with displayName', () => {
    expect(getGreeting('Sophia', new Date('2026-07-06T08:00:00+08:00'))).toBe('Good Morning, Sophia.');
  });

  it('falls back to Jimmy when displayName is empty', () => {
    expect(getGreeting('', new Date('2026-07-06T08:00:00+08:00'))).toBe('Good Morning, Jimmy.');
  });

  it('returns exactly one TodayFocus', () => {
    const focus = getTodayFocus(questions, [], buildLearningThemes(questions, []));

    expect(focus).not.toBeNull();
    expect(Array.isArray(focus)).toBe(false);
  });

  it('prioritizes the least practiced learning theme', () => {
    const records: LearningRecord[] = [
      createRecord('q1', 5, 0, 4),
      createRecord('q2', 5, 0, 4),
      createRecord('q3', 1, 0, 3),
    ];
    const focus = getTodayFocus(questions, records, buildLearningThemes(questions, records));

    expect(focus?.learningThemeName).toBe('課程教學');
    expect(focus?.reason).toBe('目前練習次數最少');
  });

  it('falls back when no learning records exist', () => {
    const focus = getTodayFocus(questions, [], buildLearningThemes(questions, []));

    expect(focus?.questionCount).toBeGreaterThan(0);
    expect(focus?.reason).toBe('尚未練習');
  });

  it('uses lower familiarity and then higher wrong count when practice counts tie', () => {
    const records: LearningRecord[] = [
      createRecord('q1', 1, 0, 3),
      createRecord('q3', 1, 0, 1),
    ];
    const focus = getTodayFocus(questions, records, buildLearningThemes(questions, records));

    expect(focus?.learningThemeName).toBe('課程教學');
  });

  it('selects recommendation by highest accumulated wrong count', () => {
    const records: LearningRecord[] = [
      createRecord('q1', 1, 1, 3),
      createRecord('q3', 1, 4, 2),
    ];
    const themes = buildLearningThemes(questions, records);
    const recommendation = getTodayRecommendation(null, themes, records);

    expect(recommendation?.title).toBe('優先複習：課程教學');
    expect(recommendation?.description).toBe('這是目前累積錯誤次數最多的學習主題，建議再練習一次。');
  });

  it('allows recommendation to be the same theme as Today focus', () => {
    const records: LearningRecord[] = [
      createRecord('q1', 0, 2, 1),
      createRecord('q3', 10, 1, 3),
    ];
    const themes = buildLearningThemes(questions, records);
    const focus = getTodayFocus(questions, records, themes);
    const recommendation = getTodayRecommendation(focus, themes, records);

    expect(focus?.learningThemeName).toBe('教學評量');
    expect(recommendation?.targetKnowledgeNode).toBe('教學評量');
  });

  it('can include multiple questions from the same LearningTheme', () => {
    const focus = getTodayFocus(questions, [], buildLearningThemes(questions, []));

    expect(focus?.learningThemeName).toBe('教學評量');
    expect(focus?.learningThemeId).toBeTruthy();
    expect(focus?.questionIds).toEqual(['q1', 'q2']);
  });

  it('keeps the same DailyMotto for the same date', () => {
    const morningMotto = getDailyMotto(new Date('2026-07-06T08:00:00+08:00'));
    const eveningMotto = getDailyMotto(new Date('2026-07-06T21:00:00+08:00'));

    expect(morningMotto).toEqual(eveningMotto);
  });

  it('does not start TodayFocus reason with the banned phrase', () => {
    const focus = getTodayFocus(questions, [], buildLearningThemes(questions, []));

    expect(focus?.reason.startsWith('因為')).toBe(false);
  });

  it('builds TodayViewModel with Focus, Learning Journey, Recommendation, and no Reminder', () => {
    const records: LearningRecord[] = [createRecord('q1', 1, 1, 2)];
    const themes = buildLearningThemes(questions, records);
    const viewModel = buildTodayViewModel({
      questions,
      learningRecords: records,
      practiceSessions: [createSession()],
      knowledgeNodes: [],
      learningThemes: themes,
      learningInsights: [],
      recommendations: [],
      date: new Date('2026-07-06T20:00:00+08:00'),
    });

    expect(viewModel.greeting).toBe('Good Evening, Jimmy.');
    expect(viewModel.focus).not.toBeNull();
    expect(viewModel.journey.answeredToday).toBe(1);
    expect(viewModel.recommendation).not.toBeNull();
    expect('reminder' in viewModel).toBe(false);
  });

  it('returns one Learning Journey model for today', () => {
    const journey = getLearningJourney([createSession()], buildLearningThemes(questions, []), new Date('2026-07-06'));

    expect(journey.items.length).toBeGreaterThan(0);
    expect(journey.answeredToday).toBe(1);
  });
});

function createQuestion(id: string, learningTheme: string, knowledgeNode: string): Question {
  return {
    id,
    year: '113',
    category: '國小',
    subject: '教育',
    questionNumber: id,
    type: '選擇題',
    score: 2,
    group: learningTheme,
    learningTheme,
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
    lastReview: '2026-07-01T00:00:00.000Z',
    viewedAI: false,
  };
}

function createSession(): PracticeSession {
  return {
    id: 'session-1',
    startTime: '2026-07-06T09:00:00.000Z',
    totalQuestions: 1,
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    durationSeconds: 60,
    questionType: '選擇題',
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
  };
}
