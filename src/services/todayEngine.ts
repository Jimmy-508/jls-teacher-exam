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
import { CHOICE_QUESTION_TYPE } from './questionBankFields';

const TODAY_QUESTION_LIMIT = 5;
const MINUTES_PER_QUESTION = 2;

export interface ThemeLearningStats {
  practiceCount: number;
  wrongCount: number;
  averageFamiliarity: number;
  lastReviewTime: number;
}

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
  random?: () => number;
}): TodayViewModel {
  const date = params.date ?? new Date();
  const focus = getTodayFocus(params.questions, params.learningRecords, params.learningThemes, params.random);

  return {
    greeting: getGreeting(params.displayName, date),
    motto: getDailyMotto(date),
    focus,
    journey: getLearningJourney(params.practiceSessions, params.learningThemes, date),
    recommendation: getTodayRecommendation(focus, params.learningThemes, params.learningRecords, params.random),
  };
}

export function getTodayFocus(
  questions: readonly Question[],
  learningRecords: readonly LearningRecord[],
  learningThemes: readonly LearningTheme[],
  random: () => number = Math.random,
): TodayFocus | null {
  const themesWithQuestions = learningThemes
    .map((theme) => ({
      theme,
      questionIds: theme.questionIds.filter((questionId) =>
        questions.some((question) => question.id === questionId && question.type === CHOICE_QUESTION_TYPE),
      ),
      stats: getThemeLearningStats(theme, learningRecords),
    }))
    .filter((item) => item.questionIds.length > 0);

  if (themesWithQuestions.length === 0) {
    return null;
  }

  const selectedTheme = selectLeastPracticedTheme(themesWithQuestions, random);
  return toTodayFocus(
    selectedTheme.theme,
    selectedTheme.questionIds,
    selectedTheme.stats.practiceCount === 0 ? '尚未練習' : '目前練習次數最少',
  );
}

export function getTodayRecommendation(
  focus: TodayFocus | null,
  learningThemes: readonly LearningTheme[] = [],
  learningRecords: readonly LearningRecord[] = [],
  random: () => number = Math.random,
): TodayRecommendation | null {
  if (learningThemes.length === 0) {
    return null;
  }

  const selectedTheme = selectRelativelyHighWrongTheme(
    learningThemes.map((theme) => ({ theme, stats: getThemeLearningStats(theme, learningRecords) })),
    random,
  );
  const stats = selectedTheme.stats;

  return {
    title: stats.wrongCount > 0 ? `優先複習：${selectedTheme.theme.name}` : `建議練習：${selectedTheme.theme.name}`,
    description:
      stats.wrongCount > 0
        ? '這是目前累積錯誤次數較高的學習主題，建議再練習一次。'
        : focus?.learningThemeName === selectedTheme.theme.name
          ? '這個主題今天仍值得多練一輪，先把基礎穩住。'
          : '這個主題的練習量或熟悉度仍有補強空間，建議安排一輪練習。',
    targetKnowledgeNode: selectedTheme.theme.name,
    targetQuestionIds: selectedTheme.theme.questionIds,
  };
}

export function getLearningJourney(
  practiceSessions: readonly PracticeSession[],
  learningThemes: readonly LearningTheme[],
  date = new Date(),
): LearningJourney {
  const dateKey = toDateKey(date);
  const sessionsToday = practiceSessions.filter((session) => toDateKey(new Date(session.startTime)) === dateKey);
  const choiceAnsweredToday = sessionsToday.reduce((sum, session) => sum + session.answers.length, 0);
  const essayAnsweredToday = sessionsToday.reduce((sum, session) => sum + getCompletedEssayCount(session), 0);
  const answeredToday = choiceAnsweredToday + essayAnsweredToday;
  const correctToday = sessionsToday.reduce((sum, session) => sum + session.correctCount, 0);
  const wrongToday = sessionsToday.reduce((sum, session) => sum + session.wrongCount, 0);
  const gradableChoiceCount = correctToday + wrongToday;
  const accuracyToday = gradableChoiceCount > 0 ? Math.round((correctToday / gradableChoiceCount) * 100) : 0;
  const practicedTheme = learningThemes.find((theme) =>
    theme.questionIds.some((questionId) => sessionsToday.some((session) => isLearningActivitySession(session) && session.questionIds.includes(questionId))),
  );
  const journeyItems: LearningJourney['items'] =
    answeredToday > 0
      ? [
          {
            label: '今日作答',
            knowledgeNodeName: practicedTheme?.name,
            value: `${answeredToday} 題`,
          },
        ]
      : [
          {
            label: '尚未開始',
            value: '完成一題練習後，JLS 會在這裡整理今日學習軌跡。',
          },
        ];

  if (answeredToday > 0 && gradableChoiceCount > 0) {
    journeyItems.push({
      label: '選擇題正確率',
      knowledgeNodeName: practicedTheme?.name,
      value: `+${accuracyToday}%`,
    });
  }

  if (answeredToday > 0 && essayAnsweredToday > 0) {
    journeyItems.push({
      label: choiceAnsweredToday > 0 ? '其中非選題' : '練習類型',
      knowledgeNodeName: practicedTheme?.name,
      value: choiceAnsweredToday > 0 ? `${essayAnsweredToday} 題` : '非選題',
    });
  }

  return {
    answeredToday,
    correctToday,
    wrongToday,
    accuracyToday,
    items: journeyItems,
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
  const answeredCount = sessionsToday.reduce((sum, session) => sum + session.answers.length + getCompletedEssayCount(session), 0);
  const correctCount = sessionsToday.reduce((sum, session) => sum + session.correctCount, 0);
  const wrongCount = sessionsToday.reduce((sum, session) => sum + session.wrongCount, 0);

  return {
    date: dateKey,
    answeredCount,
    correctCount,
    wrongCount,
    knowledgeChanges: params.learningThemes
      .filter((theme) =>
        theme.questionIds.some((questionId) => sessionsToday.some((session) => isLearningActivitySession(session) && session.questionIds.includes(questionId))),
      )
      .map((theme) => ({
        knowledgeNodeName: theme.name,
      })),
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
  random: () => number = Math.random,
): T {
  const sortedThemes = [...themes].sort(compareLeastPracticedTheme);
  const lowestPracticeCount = sortedThemes[0].stats.practiceCount;
  const candidatePool = sortedThemes.filter((item) => item.stats.practiceCount <= lowestPracticeCount + 1).slice(0, 3);
  const selectedIndex = Math.min(candidatePool.length - 1, Math.floor(random() * candidatePool.length));

  return candidatePool[selectedIndex];
}

export function selectMostWrongTheme(
  learningThemes: readonly LearningTheme[],
  learningRecords: readonly LearningRecord[],
): LearningTheme {
  return selectRelativelyHighWrongTheme(
    learningThemes.map((theme) => ({ theme, stats: getThemeLearningStats(theme, learningRecords) })),
  ).theme;
}

export function selectRelativelyHighWrongTheme<T extends { theme: LearningTheme; stats: ThemeLearningStats }>(
  themes: readonly T[],
  random: () => number = Math.random,
): T {
  const sortedThemes = [...themes].sort(compareMostWrongTheme);
  const highestWrongCount = sortedThemes[0].stats.wrongCount;
  const candidatePool =
    highestWrongCount > 0
      ? sortedThemes.filter((item) => item.stats.wrongCount >= Math.max(1, highestWrongCount - 2)).slice(0, 3)
      : sortedThemes.slice(0, 3);
  const selectedIndex = Math.min(candidatePool.length - 1, Math.floor(random() * candidatePool.length));

  return candidatePool[selectedIndex];
}

export function getGreeting(displayName?: string, date = new Date()): string {
  const hour = date.getHours();
  const name = displayName?.trim() || 'Jarvis';

  if (hour < 12) {
    return `Good Morning, ${name}.`;
  }

  if (hour < 18) {
    return `Good Afternoon, ${name}.`;
  }

  return `Good Evening, ${name}.`;
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

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getCompletedEssayCount(session: PracticeSession): number {
  return session.completedEssayQuestionIds?.length ?? session.completedEssayCount ?? 0;
}

function isLearningActivitySession(session: PracticeSession): boolean {
  return session.answers.length > 0 || getCompletedEssayCount(session) > 0;
}
