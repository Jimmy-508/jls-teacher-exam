import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';
import { sortTeacherExamSubjects } from '../constants/subjectOrder';
import { getPracticeQuestionsByType, type PracticeQuestionTypeFilter } from './questionEngine';
import { buildExamYearOptions } from './yearService';

export type WrongQuestionFilter = 'all' | 'wrongOnly';

export interface PracticeFilters {
  year: string;
  subject: string;
  coreConcept: string;
  wrongQuestion: WrongQuestionFilter;
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
    ? yearFilteredQuestions.filter((question) => question.subject === filters.subject)
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
  return getPracticeQuestionsByType(questions, typeFilter).filter((question) => {
    if (filters.year && question.year !== filters.year) {
      return false;
    }

    if (filters.subject && question.subject !== filters.subject) {
      return false;
    }

    if (filters.coreConcept && (question.coreConcept ?? question.knowledgeNode) !== filters.coreConcept) {
      return false;
    }

    if (filters.wrongQuestion === 'wrongOnly' && !isWrongQuestion(question, learningRecords[question.id])) {
      return false;
    }

    return true;
  });
}

export function isWrongQuestion(question: Question, record?: LearningRecord): boolean {
  const normalizedIsCorrect = question.isCorrect?.trim().toLowerCase() ?? '';
  const wrongCount = Number(question.wrongCount ?? 0);

  return (
    NEGATIVE_ANSWER_VALUES.has(normalizedIsCorrect) ||
    (Number.isFinite(wrongCount) && wrongCount > 0) ||
    Boolean(record && record.wrongCount > 0)
  );
}

export function hasActivePracticeFilters(filters: PracticeFilters): boolean {
  return Boolean(filters.year || filters.subject || filters.coreConcept || filters.wrongQuestion !== 'all');
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
