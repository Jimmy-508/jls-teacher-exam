import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TODAY_PRACTICE_HISTORY_STORAGE_KEY,
  getTodayDateKey,
  loadTodayPracticeHistory,
  recordTodayPracticeQuestions,
  saveTodayPracticeHistory,
  selectTodayPracticeQuestionIds,
  type TodayPracticeHistory,
} from './todayPracticeHistoryService';

describe('todayPracticeHistoryService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    const store = new Map<string, string>();

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => store.clear()),
    });
  });

  it('selects today practice questions from unseen questions first', () => {
    const selected = selectTodayPracticeQuestionIds({
      learningTheme: '形成性評量',
      questionIds: ['Q1', 'Q2', 'Q3'],
      count: 1,
      history: createHistory({ drawnByLearningTheme: { 形成性評量: ['Q1'] } }),
      shuffleFn: (items) => [...items],
    });

    expect(selected).toEqual(['Q2']);
  });

  it('does not select the same question on the same day while unseen questions remain', () => {
    const first = selectTodayPracticeQuestionIds({
      learningTheme: '形成性評量',
      questionIds: ['Q1', 'Q2'],
      count: 1,
      history: createHistory(),
      shuffleFn: (items) => [...items],
    });
    const nextHistory = recordTodayPracticeQuestions(createHistory(), '形成性評量', first);
    const second = selectTodayPracticeQuestionIds({
      learningTheme: '形成性評量',
      questionIds: ['Q1', 'Q2'],
      count: 1,
      history: nextHistory,
      shuffleFn: (items) => [...items],
    });

    expect(first).toEqual(['Q1']);
    expect(second).toEqual(['Q2']);
  });

  it('cycles again when every question in the theme has been used today', () => {
    const selected = selectTodayPracticeQuestionIds({
      learningTheme: '形成性評量',
      questionIds: ['Q1', 'Q2'],
      count: 1,
      history: createHistory({ drawnByLearningTheme: { 形成性評量: ['Q1', 'Q2'] } }),
      shuffleFn: (items) => [...items],
    });

    expect(selected).toEqual(['Q1']);
  });

  it('loads persisted history for the same date and resets it on the next day', async () => {
    const history = createHistory({ dateKey: '2026-07-11', drawnQuestionIds: ['Q1'] });
    await saveTodayPracticeHistory(history);

    await expect(loadTodayPracticeHistory(new Date('2026-07-11T08:00:00.000Z'))).resolves.toMatchObject({
      dateKey: '2026-07-11',
      drawnQuestionIds: ['Q1'],
    });
    await expect(loadTodayPracticeHistory(new Date('2026-07-12T08:00:00.000Z'))).resolves.toMatchObject({
      dateKey: '2026-07-12',
      drawnQuestionIds: [],
    });
    expect(localStorage.setItem).toHaveBeenCalledWith(TODAY_PRACTICE_HISTORY_STORAGE_KEY, JSON.stringify(history));
  });

  it('formats date keys by calendar day', () => {
    expect(getTodayDateKey(new Date('2026-07-11T08:00:00.000Z'))).toBe('2026-07-11');
  });
});

function createHistory(overrides: Partial<TodayPracticeHistory> = {}): TodayPracticeHistory {
  return {
    dateKey: '2026-07-11',
    drawnQuestionIds: [],
    drawnByLearningTheme: {},
    ...overrides,
  };
}
