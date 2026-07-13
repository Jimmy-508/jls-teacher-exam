import { dailyMottos } from '../constants/dailyMottos';
import type { KnowledgeNode } from '../types/KnowledgeNode';
import type { LearningInsight } from '../types/LearningInsight';
import type { LearningRecord } from '../types/LearningRecord';
import type { LearningTheme } from '../types/LearningTheme';
import type { PracticeSession } from '../types/PracticeSession';
import type { Question } from '../types/question';
import type {
  DailyMotto,
  LearningCommit,
  LearningJourney,
  TodayFocus,
  TodayRecommendation,
  TodayViewModel,
} from '../types/Today';
import { compareSubjects } from './learningThemeService';

const TODAY_QUESTION_LIMIT = 5;
const MINUTES_PER_QUESTION = 2;

export function buildTodayViewModel(params: {
  questions: readonly Question[];
  learningRecords: readonly LearningRecord[];
  practiceSessions: readonly PracticeSession[];
  knowledgeNodes: readonly KnowledgeNode[];
  learningThemes: readonly LearningTheme[];
  learningInsights: readonly LearningInsight[];
  recommendations: readonly unknown[];
  displayName?: string;
  date?: Date;
}): TodayViewModel {
  const date = params.date ?? new Date();
  const focus = getTodayFocus(params.questions, params.learningRecords, params.learningThemes);

  return {
    greeting: getGreeting(params.displayName, date),
    motto: getDailyMotto(date),
    focus,
    journey: getLearningJourney(params.practiceSessions, params.learningThemes, date),
    recommendation: getTodayRecommendation(focus, params.learningThemes, params.learningRecords),
  };
}

export interface ThemeLearningStats {
  practiceCount: number;
  wrongCount: number;
  averageFamiliarity: number;
  lastReviewTime: number;
}

export function getTodayFocus(
  questions: readonly Question[],
  learningRecords: readonly LearningRecord[],
  learningThemes: readonly LearningTheme[],
): TodayFocus | null {
  const themesWithQuestions = learningThemes
    .map((theme) => ({
      theme,
      questionIds: theme.questionIds.filter((questionId) =>
        questions.some((question) => question.id === questionId && question.type === '選擇題'),
      ),
      stats: getThemeLearningStats(theme, learningRecords),
    }))
    .filter((item) => item.questionIds.length > 0);

  if (themesWithQuestions.length === 0) {
    return null;
  }

  const selectedTheme = selectLeastPracticedTheme(themesWithQuestions);
  return toTodayFocus(
    selectedTheme.theme,
    selectedTheme.questionIds,
    selectedTheme.stats.practiceCount === 0 ? '尚未練習' : '目前練習次數最少',
  );
}

export function getLearningJourney(
  practiceSessions: readonly PracticeSession[],
  learningThemes: readonly LearningTheme[],
  date = new Date(),
): LearningJourney {
  const dateKey = toDateKey(date);
  const sessionsToday = practiceSessions.filter((session) => toDateKey(new Date(session.startTime)) === dateKey);
  const answeredToday = sessionsToday.reduce((sum, session) => sum + session.answers.length, 0);
  const correctToday = sessionsToday.reduce((sum, session) => sum + session.correctCount, 0);
  const wrongToday = sessionsToday.reduce((sum, session) => sum + session.wrongCount, 0);
  const accuracyToday = answeredToday > 0 ? Math.round((correctToday / answeredToday) * 100) : 0;
  const practicedTheme = learningThemes.find((theme) =>
    theme.questionIds.some((questionId) => sessionsToday.some((session) => session.questionIds.includes(questionId))),
  );

  return {
    answeredToday,
    correctToday,
    wrongToday,
    accuracyToday,
    items:
      answeredToday > 0
        ? [
            {
              label: '完成',
              knowledgeNodeName: practicedTheme?.name,
              value: `${answeredToday} 題`,
            },
            {
              label: '正確率',
              knowledgeNodeName: practicedTheme?.name,
              value: `+${accuracyToday}%`,
            },
          ]
        : [
            {
              label: '尚未開始',
              value: '完成今日焦點後，這裡會留下今天的學習軌跡。',
            },
          ],
  };
}

export function getTodayRecommendation(
  focus: TodayFocus | null,
  learningThemes: readonly LearningTheme[] = [],
  learningRecords: readonly LearningRecord[] = [],
): TodayRecommendation | null {
  if (learningThemes.length === 0) {
    return null;
  }

  const selectedTheme = selectMostWrongTheme(learningThemes, learningRecords);
  const stats = getThemeLearningStats(selectedTheme, learningRecords);

  return {
    title: stats.wrongCount > 0 ? `優先複習：${selectedTheme.name}` : `建議練習：${selectedTheme.name}`,
    description:
      stats.wrongCount > 0
        ? '這是目前累積錯誤次數最多的學習主題，建議再練習一次。'
        : focus?.learningThemeName === selectedTheme.name
          ? '先完成今日焦點，建立更完整的學習紀錄。'
          : '目前沒有累積錯誤紀錄，建議從較需要練習的主題開始。',
    targetKnowledgeNode: selectedTheme.name,
    targetQuestionIds: selectedTheme.questionIds,
  };
}

export function getDailyMotto(date = new Date()): DailyMotto {
  const dayIndex = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return {
    text: dailyMottos[dayIndex % dailyMottos.length],
  };
}

export function buildLearningCommit(params: {
  date: Date;
  practiceSessions: readonly PracticeSession[];
  learningThemes: readonly LearningTheme[];
}): LearningCommit {
  const dateKey = toDateKey(params.date);
  const sessionsToday = params.practiceSessions.filter((session) => toDateKey(new Date(session.startTime)) === dateKey);
  const answeredCount = sessionsToday.reduce((sum, session) => sum + session.answers.length, 0);
  const correctCount = sessionsToday.reduce((sum, session) => sum + session.correctCount, 0);
  const wrongCount = sessionsToday.reduce((sum, session) => sum + session.wrongCount, 0);

  return {
    date: dateKey,
    answeredCount,
    correctCount,
    wrongCount,
    knowledgeChanges: params.learningThemes
      .filter((theme) =>
        theme.questionIds.some((questionId) => sessionsToday.some((session) => session.questionIds.includes(questionId))),
      )
      .map((theme) => ({
        knowledgeNodeName: theme.name,
      })),
  };
}

function toTodayFocus(theme: LearningTheme, questionIds: string[], reason: string): TodayFocus {
  return {
    knowledgeNodeId: theme.id,
    learningThemeId: theme.id,
    learningThemeName: theme.name,
    knowledgeNodeName: theme.name,
    questionIds,
    questionCount: Math.min(questionIds.length, TODAY_QUESTION_LIMIT),
    estimatedMinutes: Math.min(questionIds.length, TODAY_QUESTION_LIMIT) * MINUTES_PER_QUESTION,
    reason,
  };
}

export function getThemeLearningStats(theme: LearningTheme, learningRecords: readonly LearningRecord[]): ThemeLearningStats {
  const themeRecords = learningRecords.filter((record) => theme.questionIds.includes(record.questionId));
  const wrongCount = themeRecords.reduce((sum, record) => sum + record.wrongCount, 0);
  const practiceCount = themeRecords.reduce((sum, record) => sum + record.correctCount + record.wrongCount, 0);
  const lastReviewTimes = themeRecords
    .map((record) => (record.lastReview ? new Date(record.lastReview).getTime() : 0))
    .filter((time) => time > 0);

  return {
    practiceCount,
    wrongCount,
    averageFamiliarity: theme.averageFamiliarity,
    lastReviewTime: lastReviewTimes.length > 0 ? Math.min(...lastReviewTimes) : 0,
  };
}

export function selectLeastPracticedTheme<T extends { theme: LearningTheme; stats: ThemeLearningStats }>(
  themes: readonly T[],
): T {
  return [...themes].sort(compareLeastPracticedTheme)[0];
}

export function selectMostWrongTheme(
  learningThemes: readonly LearningTheme[],
  learningRecords: readonly LearningRecord[],
): LearningTheme {
  return [...learningThemes]
    .map((theme) => ({ theme, stats: getThemeLearningStats(theme, learningRecords) }))
    .sort(compareMostWrongTheme)[0].theme;
}

function compareLeastPracticedTheme<T extends { theme: LearningTheme; stats: ThemeLearningStats }>(left: T, right: T): number {
  return (
    left.stats.practiceCount - right.stats.practiceCount ||
    left.stats.averageFamiliarity - right.stats.averageFamiliarity ||
    right.stats.wrongCount - left.stats.wrongCount ||
    compareThemeOrder(left.theme, right.theme)
  );
}

function compareMostWrongTheme(
  left: { theme: LearningTheme; stats: ThemeLearningStats },
  right: { theme: LearningTheme; stats: ThemeLearningStats },
): number {
  return (
    right.stats.wrongCount - left.stats.wrongCount ||
    left.stats.averageFamiliarity - right.stats.averageFamiliarity ||
    left.stats.practiceCount - right.stats.practiceCount ||
    compareThemeOrder(left.theme, right.theme)
  );
}

function compareThemeOrder(left: LearningTheme, right: LearningTheme): number {
  return compareSubjects(left.subject, right.subject) || left.name.localeCompare(right.name, 'zh-Hant');
}

export function getGreeting(displayName?: string, date = new Date()): string {
  const hour = date.getHours();
  const name = displayName?.trim() || 'Jimmy';

  if (hour < 12) {
    return `Good Morning, ${name}.`;
  }

  if (hour < 18) {
    return `Good Afternoon, ${name}.`;
  }

  return `Good Evening, ${name}.`;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
