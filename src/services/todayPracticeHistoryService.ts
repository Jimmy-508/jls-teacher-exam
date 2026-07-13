import { shuffle } from '../utils/shuffle';
import { load, save } from './storageService';

export const TODAY_PRACTICE_HISTORY_STORAGE_KEY = 'jls-today-practice-history';

export interface TodayPracticeHistory {
  dateKey: string;
  drawnQuestionIds: string[];
  drawnByLearningTheme: Record<string, string[]>;
}

export interface SelectTodayPracticeQuestionsParams {
  learningTheme: string;
  questionIds: readonly string[];
  count: number;
  history: TodayPracticeHistory;
  shuffleFn?: <T>(items: readonly T[]) => T[];
}

export function getTodayDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function loadTodayPracticeHistory(date = new Date()): Promise<TodayPracticeHistory> {
  const dateKey = getTodayDateKey(date);
  const savedHistory = await load<TodayPracticeHistory>(TODAY_PRACTICE_HISTORY_STORAGE_KEY);

  if (!savedHistory || savedHistory.dateKey !== dateKey) {
    return createEmptyTodayPracticeHistory(dateKey);
  }

  return {
    dateKey,
    drawnQuestionIds: Array.from(new Set(savedHistory.drawnQuestionIds)),
    drawnByLearningTheme: normalizeDrawnByLearningTheme(savedHistory.drawnByLearningTheme),
  };
}

export async function selectAndSaveTodayPracticeQuestions(params: {
  learningTheme: string;
  questionIds: readonly string[];
  count: number;
  date?: Date;
}): Promise<string[]> {
  const history = await loadTodayPracticeHistory(params.date);
  const selectedQuestionIds = selectTodayPracticeQuestionIds({
    learningTheme: params.learningTheme,
    questionIds: params.questionIds,
    count: params.count,
    history,
  });

  await saveTodayPracticeHistory(recordTodayPracticeQuestions(history, params.learningTheme, selectedQuestionIds));
  return selectedQuestionIds;
}

export function selectTodayPracticeQuestionIds({
  learningTheme,
  questionIds,
  count,
  history,
  shuffleFn = shuffle,
}: SelectTodayPracticeQuestionsParams): string[] {
  const uniqueQuestionIds = Array.from(new Set(questionIds.filter(Boolean)));
  const normalizedCount = Math.max(1, Math.min(Math.floor(count), uniqueQuestionIds.length || 1));

  if (uniqueQuestionIds.length === 0) {
    return [];
  }

  const drawnForTheme = new Set(history.drawnByLearningTheme[learningTheme] ?? []);
  const unseenQuestionIds = uniqueQuestionIds.filter((questionId) => !drawnForTheme.has(questionId));
  const sourceQuestionIds = unseenQuestionIds.length > 0 ? unseenQuestionIds : uniqueQuestionIds;

  return shuffleFn(sourceQuestionIds).slice(0, normalizedCount);
}

export function recordTodayPracticeQuestions(
  history: TodayPracticeHistory,
  learningTheme: string,
  questionIds: readonly string[],
): TodayPracticeHistory {
  const uniqueSelectedIds = Array.from(new Set(questionIds.filter(Boolean)));
  const previousThemeIds = history.drawnByLearningTheme[learningTheme] ?? [];

  return {
    dateKey: history.dateKey,
    drawnQuestionIds: Array.from(new Set([...history.drawnQuestionIds, ...uniqueSelectedIds])),
    drawnByLearningTheme: {
      ...history.drawnByLearningTheme,
      [learningTheme]: Array.from(new Set([...previousThemeIds, ...uniqueSelectedIds])),
    },
  };
}

export async function saveTodayPracticeHistory(history: TodayPracticeHistory): Promise<void> {
  await save(TODAY_PRACTICE_HISTORY_STORAGE_KEY, history);
}

function createEmptyTodayPracticeHistory(dateKey: string): TodayPracticeHistory {
  return {
    dateKey,
    drawnQuestionIds: [],
    drawnByLearningTheme: {},
  };
}

function normalizeDrawnByLearningTheme(value: Record<string, string[]> = {}): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(value).map(([learningTheme, questionIds]) => [
      learningTheme,
      Array.from(new Set(questionIds.filter(Boolean))),
    ]),
  );
}
