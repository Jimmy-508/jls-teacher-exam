import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';
import { normalizeSubjectName, sortTeacherExamSubjects } from '../constants/subjectOrder';
import { getPracticeQuestionsByType, normalizeChoiceKey, type PracticeQuestionTypeFilter } from './questionEngine';
import { buildExamYearOptions } from './yearService';

export type WrongQuestionFilter = 'all' | 'wrongOnly' | 'wrongElimination';

export interface PracticeFilters {
  year: string;
  subject: string;
  coreConcept: string;
  wrongQuestion: WrongQuestionFilter;
  searchQuery?: string;
}

export interface PracticeFilterOptions {
  years: string[];
  subjects: string[];
  coreConcepts: string[];
}

export const DEFAULT_PRACTICE_FILTERS: PracticeFilters = {
  year: '',
  subject: '',
  coreConcept: '',
  wrongQuestion: 'all',
  searchQuery: '',
};

const NEGATIVE_ANSWER_VALUES = new Set(['否', 'false', '0', 'no', 'n', 'wrong', 'incorrect', '錯', '答錯']);

export function buildPracticeFilterOptions(questions: readonly Question[], selectedYear = ''): PracticeFilterOptions {
  const questionsForSubjectOptions = selectedYear
    ? questions.filter((question) => question.year === selectedYear)
    : questions;
  const questionsForCoreConceptOptions = questionsForSubjectOptions;

  return {
    years: buildExamYearOptions(questions.map((question) => question.year)),
    subjects: sortTeacherExamSubjects(questionsForSubjectOptions.map((question) => question.subject)),
    coreConcepts: sortCoreConcepts(questionsForCoreConceptOptions.map((question) => question.coreConcept ?? question.knowledgeNode)),
  };
}

export function buildPracticeFilterOptionsForFilters(
  questions: readonly Question[],
  filters: Pick<PracticeFilters, 'year' | 'subject'>,
): PracticeFilterOptions {
  const yearFilteredQuestions = filters.year ? questions.filter((question) => question.year === filters.year) : questions;
  const subjectFilteredQuestions = filters.subject
    ? yearFilteredQuestions.filter((question) => isSameSubject(question.subject, filters.subject))
    : yearFilteredQuestions;

  return {
    years: buildExamYearOptions(questions.map((question) => question.year)),
    subjects: sortTeacherExamSubjects(yearFilteredQuestions.map((question) => question.subject)),
    coreConcepts: sortCoreConcepts(subjectFilteredQuestions.map((question) => question.coreConcept ?? question.knowledgeNode)),
  };
}

export function filterPracticeQuestions(
  questions: readonly Question[],
  filters: PracticeFilters,
  typeFilter: PracticeQuestionTypeFilter,
  learningRecords: Record<string, LearningRecord> = {},
): Question[] {
  const effectiveWrongQuestion = normalizeWrongQuestionFilterForType(filters.wrongQuestion, typeFilter);

  return getPracticeQuestionsByType(questions, typeFilter).filter((question) => {
    if (filters.year && question.year !== filters.year) {
      return false;
    }

    if (filters.subject && !isSameSubject(question.subject, filters.subject)) {
      return false;
    }

    if (filters.coreConcept && (question.coreConcept ?? question.knowledgeNode) !== filters.coreConcept) {
      return false;
    }

    if (effectiveWrongQuestion !== 'all' && !isWrongQuestion(question, learningRecords[question.id])) {
      return false;
    }

    if (!matchesPracticeSearch(question, filters.searchQuery ?? '')) {
      return false;
    }

    return true;
  });
}

export function isSameSubject(left: string, right: string): boolean {
  return normalizeSubjectName(left) === normalizeSubjectName(right);
}

export function normalizeWrongQuestionFilterForType(
  wrongQuestion: WrongQuestionFilter,
  typeFilter: PracticeQuestionTypeFilter,
): WrongQuestionFilter {
  return typeFilter === 'choice' ? wrongQuestion : 'all';
}

export function isWrongQuestion(question: Question, record?: LearningRecord): boolean {
  if (!normalizeChoiceKey(question.correctAnswer)) {
    return false;
  }

  const normalizedIsCorrect = question.isCorrect?.trim().toLowerCase() ?? '';
  const wrongCount = Number(question.wrongCount ?? 0);

  return (
    NEGATIVE_ANSWER_VALUES.has(normalizedIsCorrect) ||
    (Number.isFinite(wrongCount) && wrongCount > 0) ||
    Boolean(record && record.wrongCount > 0)
  );
}

export function normalizePracticeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function splitPracticeSearchKeywords(value: string): string[] {
  return normalizePracticeSearchQuery(value)
    .split(' ')
    .map((keyword) => normalizePracticeSearchText(keyword))
    .filter(Boolean);
}

export function matchesPracticeSearch(question: Question, searchQuery: string | undefined): boolean {
  const keywords = splitPracticeSearchKeywords(searchQuery ?? '');

  if (keywords.length === 0) {
    return true;
  }

  const searchableFields = [
    question.year,
    question.questionNumber,
    question.stem,
    question.optionA,
    question.optionB,
    question.optionC,
    question.optionD,
  ]
    .map((field) => normalizePracticeSearchText(field ?? ''))
    .filter(Boolean);

  return keywords.every((keyword) => searchableFields.some((field) => field.includes(keyword)));
}

function normalizePracticeSearchText(value: string): string {
  return value.toLocaleLowerCase('en');
}

function formatPracticeSearchSummary(value: string): string {
  const normalized = normalizePracticeSearchQuery(value);
  return normalized.length > 18 ? normalized.slice(0, 18) + '\u2026' : normalized;
}

export function hasActivePracticeFilters(filters: PracticeFilters): boolean {
  return Boolean(filters.year || filters.subject || filters.coreConcept || filters.wrongQuestion !== 'all' || filters.searchQuery);
}

export function summarizePracticeFilters(filters: PracticeFilters): string[] {
  const labels: string[] = [];

  if (filters.year) {
    labels.push(filters.year);
  }

  if (filters.subject) {
    labels.push(filters.subject);
  }

  if (filters.coreConcept) {
    labels.push(filters.coreConcept);
  }

  if (filters.wrongQuestion === 'wrongOnly') {
    labels.push('僅錯題');
  }

  if (filters.wrongQuestion === 'wrongElimination') {
    labels.push('錯題消除模式');
  }

  return labels;
}

export function sortCoreConcepts(concepts: readonly string[]): string[] {
  const uniqueConcepts = Array.from(new Set(concepts.map((concept) => concept.trim()).filter(Boolean)));
  const englishConcepts = uniqueConcepts.filter(isEnglishLeadingCoreConcept).sort(compareEnglishCoreConceptByKey);
  const otherConcepts = uniqueConcepts
    .filter((concept) => !isEnglishLeadingCoreConcept(concept))
    .sort(compareZhCoreConceptByKey);

  return [...englishConcepts, ...otherConcepts];
}

function isEnglishLeadingCoreConcept(value: string): boolean {
  const firstEffectiveChar = getCoreConceptSortKey(value)[0] ?? '';
  return /^[A-Za-z]$/.test(firstEffectiveChar);
}

function compareEnglishCoreConceptByKey(left: string, right: string): number {
  return (
    getCoreConceptSortKey(left).localeCompare(getCoreConceptSortKey(right), 'en', {
      numeric: true,
      sensitivity: 'base',
    }) || left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' })
  );
}

function compareZhCoreConceptByKey(left: string, right: string): number {
  return (
    getCoreConceptSortKey(left).localeCompare(getCoreConceptSortKey(right), 'zh-Hant', {
      numeric: true,
      sensitivity: 'base',
    }) || left.localeCompare(right, 'zh-Hant', { numeric: true, sensitivity: 'base' })
  );
}

function getCoreConceptSortKey(value: string): string {
  return value.trim().replace(/^[\s"'“”‘’「」『』()（）【】\[\]{}<>《》]+/, '');
}

function isEnglishLeadingConcept(value: string): boolean {
  const normalizedValue = value.trim().replace(/^[\s"'“”‘’「」『』()（）【】\[\]{}<>《》]+/, '');
  const firstEffectiveChar = normalizedValue[0] ?? '';
  return /^[A-Za-z]$/.test(firstEffectiveChar);
}

function compareEnglishCoreConcept(left: string, right: string): number {
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
}

function compareZhCoreConcept(left: string, right: string): number {
  return left.localeCompare(right, 'zh-Hant', { numeric: true, sensitivity: 'base' });
}
