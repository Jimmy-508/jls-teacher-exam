import type { LearningRecord } from '../types/LearningRecord';
import type { LearningTheme } from '../types/LearningTheme';
import type { Question } from '../types/question';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from './questionBankFields';
import { getLearningThemeDisplayName } from './displayDictionary';

const WEAK_THEME_ERROR_RATE_THRESHOLD = 0.5;
const WEAK_THEME_FAMILIARITY_THRESHOLD = 1.5;
const UNCATEGORIZED_SUBJECT = '未分類科目';

export const SUBJECT_DISPLAY_ORDER = [
  '教育理念與實務',
  '學習者發展與適性輔導',
  '課程教學與評量',
  '國語文能力測驗',
] as const;

interface LearningThemeAccumulator {
  id: string;
  subject: string;
  name: string;
  questionIds: string[];
  choiceQuestionCount: number;
  essayQuestionCount: number;
  knowledgeNodeIds: Set<string>;
  wrongCount: number;
  familiarityTotal: number;
  recordCount: number;
  lastReviewedAt?: string;
}

export function buildLearningThemes(
  questions: readonly Question[],
  learningRecords: readonly LearningRecord[] = [],
): LearningTheme[] {
  const recordsByQuestionId = new Map(learningRecords.map((record) => [record.questionId, record]));
  const themeMap = new Map<string, LearningThemeAccumulator>();

  questions.forEach((question) => {
    const { subject, name: themeName } = resolveQuestionLearningTheme(question);
    const themeId = createSubjectThemeId(subject, themeName);
    const currentTheme = themeMap.get(themeId) ?? createLearningThemeAccumulator(themeId, subject, themeName);
    const record = recordsByQuestionId.get(question.id);

    currentTheme.questionIds.push(question.id);
    currentTheme.choiceQuestionCount += question.type === CHOICE_QUESTION_TYPE ? 1 : 0;
    currentTheme.essayQuestionCount += question.type === ESSAY_QUESTION_TYPE ? 1 : 0;
    currentTheme.knowledgeNodeIds.add(normalizeThemeId((question.coreConcept ?? question.knowledgeNode) || '未分類核心概念'));

    if (record) {
      currentTheme.wrongCount += record.wrongCount;
      currentTheme.familiarityTotal += record.familiarity;
      currentTheme.recordCount += 1;

      if (record.lastReview && (!currentTheme.lastReviewedAt || record.lastReview > currentTheme.lastReviewedAt)) {
        currentTheme.lastReviewedAt = record.lastReview;
      }
    }

    themeMap.set(themeId, currentTheme);
  });

  return Array.from(themeMap.values())
    .map((theme) => ({
      id: theme.id,
      subject: theme.subject,
      name: theme.name,
      questionIds: theme.questionIds,
      knowledgeNodeIds: Array.from(theme.knowledgeNodeIds),
      questionCount: theme.questionIds.length,
      choiceQuestionCount: theme.choiceQuestionCount,
      essayQuestionCount: theme.essayQuestionCount,
      wrongCount: theme.wrongCount,
      averageFamiliarity: theme.recordCount > 0 ? Number((theme.familiarityTotal / theme.recordCount).toFixed(2)) : 0,
      lastReviewedAt: theme.lastReviewedAt,
    }))
    .sort((left, right) => compareSubjects(left.subject, right.subject) || sortByZh(left.name, right.name));
}

export function getQuestionsByTheme(questions: readonly Question[], themeName: string, subject?: string): Question[] {
  return questions.filter((question) => isQuestionInLearningTheme(question, subject, themeName));
}

export function resolveQuestionLearningTheme(question: Question): { subject: string; name: string } {
  return {
    subject: question.subject.trim() || UNCATEGORIZED_SUBJECT,
    name: getDisplayLearningTheme(question),
  };
}

export function isQuestionInLearningTheme(question: Question, subject: string | undefined, learningThemeName: string): boolean {
  const resolvedTheme = resolveQuestionLearningTheme(question);
  const normalizedSubject = subject?.trim();
  const normalizedThemeName = getLearningThemeDisplayName(learningThemeName.trim());

  return (!normalizedSubject || resolvedTheme.subject === normalizedSubject) && resolvedTheme.name === normalizedThemeName;
}

export function calculateThemeErrorRate(
  theme: LearningTheme,
  learningRecords: readonly LearningRecord[] = [],
): number {
  const answeredCount = learningRecords
    .filter((record) => theme.questionIds.includes(record.questionId))
    .reduce((sum, record) => sum + record.correctCount + record.wrongCount, 0);
  const denominator = answeredCount > 0 ? answeredCount : theme.questionCount;

  if (denominator === 0) {
    return 0;
  }

  return Number((theme.wrongCount / denominator).toFixed(2));
}

export function calculateThemeAverageFamiliarity(
  theme: LearningTheme,
  learningRecords: readonly LearningRecord[] = [],
): number {
  const records = learningRecords.filter((record) => theme.questionIds.includes(record.questionId));

  if (records.length > 0) {
    return Number((records.reduce((sum, record) => sum + record.familiarity, 0) / records.length).toFixed(2));
  }

  return theme.averageFamiliarity;
}

export function detectWeakLearningThemes(themes: readonly LearningTheme[]): LearningTheme[] {
  return themes.filter((theme) => {
    const errorRate = calculateThemeErrorRate(theme);
    return (
      (theme.wrongCount > 0 && errorRate >= WEAK_THEME_ERROR_RATE_THRESHOLD) ||
      (theme.averageFamiliarity > 0 && theme.averageFamiliarity <= WEAK_THEME_FAMILIARITY_THRESHOLD)
    );
  });
}

export function findThemeByKnowledgeNode(
  themes: readonly LearningTheme[],
  coreConceptName: string,
): LearningTheme | undefined {
  const normalizedCoreConceptId = normalizeThemeId(coreConceptName);
  return themes.find(
    (theme) => theme.knowledgeNodeIds.includes(coreConceptName) || theme.knowledgeNodeIds.includes(normalizedCoreConceptId),
  );
}

function createLearningThemeAccumulator(id: string, subject: string, name: string): LearningThemeAccumulator {
  return {
    id,
    subject,
    name,
    questionIds: [],
    choiceQuestionCount: 0,
    essayQuestionCount: 0,
    knowledgeNodeIds: new Set<string>(),
    wrongCount: 0,
    familiarityTotal: 0,
    recordCount: 0,
  };
}

function createSubjectThemeId(subject: string, themeName: string): string {
  return `${normalizeThemeId(subject)}::${normalizeThemeId(themeName)}`;
}

function normalizeThemeId(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '');

  return normalizedName || 'uncategorized';
}

function getDisplayLearningTheme(question: Question): string {
  const subject = question.subject.trim();
  const category = question.category.trim();
  const themeCandidates = [question.learningTheme, question.group]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value !== subject && value !== category);

  return getLearningThemeDisplayName(themeCandidates[0] || (question.coreConcept ?? question.knowledgeNode).trim() || '未分類主題');
}

function sortByZh(left: string, right: string): number {
  return left.localeCompare(right, 'zh-Hant');
}

export function compareSubjects(left: string, right: string): number {
  const normalizedLeft = left.trim() || UNCATEGORIZED_SUBJECT;
  const normalizedRight = right.trim() || UNCATEGORIZED_SUBJECT;

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  if (normalizedLeft === UNCATEGORIZED_SUBJECT) {
    return 1;
  }

  if (normalizedRight === UNCATEGORIZED_SUBJECT) {
    return -1;
  }

  const leftIndex = SUBJECT_DISPLAY_ORDER.indexOf(normalizedLeft as (typeof SUBJECT_DISPLAY_ORDER)[number]);
  const rightIndex = SUBJECT_DISPLAY_ORDER.indexOf(normalizedRight as (typeof SUBJECT_DISPLAY_ORDER)[number]);

  if (leftIndex >= 0 || rightIndex >= 0) {
    if (leftIndex < 0) {
      return 1;
    }

    if (rightIndex < 0) {
      return -1;
    }

    return leftIndex - rightIndex;
  }

  return sortByZh(normalizedLeft, normalizedRight);
}
