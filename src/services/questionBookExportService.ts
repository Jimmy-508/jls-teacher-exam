import { CHOICE_QUESTION_TYPE } from './questionBankFields';
import { normalizeChoiceKey } from './questionEngine';
import { matchesPracticeSearch, normalizePracticeSearchQuery, isSameSubject, sortCoreConcepts } from './practiceFilterService';
import { saveBlobWithPicker, type SaveBlobResult } from './fileSaveService';
import { buildExamYearOptions } from './yearService';
import { sortTeacherExamSubjects } from '../constants/subjectOrder';
import {
  buildChoiceQuestionPdfModel,
  compareQuestions,
  createWrongQuestionPdfBlobFromModel,
  getAllFilterValue,
} from './wrongQuestionExportService';
import type { Question } from '../types/question';
import type {
  QuestionBookExportItem,
  QuestionBookFilterOptions,
  QuestionBookFilters,
  QuestionBookPdfModel,
} from '../types/QuestionBookExport';
import type { WrongQuestionExportItem } from '../types/WrongQuestionExport';

const ALL = getAllFilterValue();

export function createInitialQuestionBookFilters(): QuestionBookFilters {
  return {
    year: ALL,
    subject: ALL,
    learningTheme: ALL,
    searchQuery: '',
  };
}

export function buildQuestionBookFilterOptions(
  questions: readonly Question[],
  filters: Pick<QuestionBookFilters, 'year' | 'subject'>,
): QuestionBookFilterOptions {
  const yearFiltered = questions.filter((question) => matchesAllFilter(question.year, filters.year));
  const subjectFiltered = filters.subject === ALL
    ? yearFiltered
    : yearFiltered.filter((question) => isSameSubject(question.subject, filters.subject));

  return {
    years: [ALL, ...buildExamYearOptions(questions.map((question) => question.year))],
    subjects: [ALL, ...sortTeacherExamSubjects(yearFiltered.map((question) => question.subject))],
    learningThemes: [ALL, ...sortCoreConcepts(subjectFiltered.map(getQuestionLearningTheme))],
  };
}

export function filterQuestionBookQuestions(
  questions: readonly Question[],
  filters: QuestionBookFilters,
): QuestionBookExportItem[] {
  return questions
    .filter((question) => question.type === CHOICE_QUESTION_TYPE)
    .filter((question) => Boolean(normalizeChoiceKey(question.correctAnswer)))
    .filter((question) => matchesAllFilter(question.year, filters.year))
    .filter((question) => filters.subject === ALL || isSameSubject(question.subject, filters.subject))
    .filter((question) => matchesAllFilter(getQuestionLearningTheme(question), filters.learningTheme))
    .filter((question) => matchesPracticeSearch(question, filters.searchQuery))
    .sort((left, right) => compareQuestions(left, right))
    .map((question) => ({ question }));
}

export function buildQuestionBookPdfModel(params: {
  displayName: string;
  items: readonly QuestionBookExportItem[];
  filters?: QuestionBookFilters;
  now?: Date;
}): QuestionBookPdfModel {
  const now = params.now ?? new Date();
  const displayDateLabel = formatDisplayDate(now);
  const fileDateLabel = formatLocalFileDate(now);

  return buildChoiceQuestionPdfModel({
    displayName: params.displayName,
    items: params.items.map(toWrongQuestionPdfItem),
    now,
    bookLabel: '試題本',
    analysisTitleText: '試題本解析',
    displayDateLabel,
    fileDateLabel,
    titleFilterText: buildQuestionBookTitleFilterText(params.filters),
    suppressConsecutiveDuplicateStemImages: true,
  });
}

export function normalizeQuestionBookSearchQuery(value: string): string {
  return normalizePracticeSearchQuery(value);
}

export function buildQuestionBookTitleFilterText(filters: QuestionBookFilters | undefined): string {
  if (!filters) {
    return '';
  }

  const labels = [formatQuestionBookYearFilter(filters.year), normalizeAllFilterLabel(filters.subject), normalizeAllFilterLabel(filters.learningTheme)]
    .filter(Boolean) as string[];
  const searchQuery = normalizeQuestionBookSearchQuery(filters.searchQuery);

  if (searchQuery) {
    labels.push(searchQuery);
  }

  return labels.length > 0 ? `主題：${labels.join('・')}` : '';
}

function formatQuestionBookYearFilter(value: string): string {
  const normalized = normalizeAllFilterLabel(value);

  if (!normalized) {
    return '';
  }

  return normalized.endsWith('年') ? normalized : `${normalized}年`;
}

function normalizeAllFilterLabel(value: string): string {
  const normalized = value.trim();
  return normalized && normalized !== ALL ? normalized : '';
}

export async function exportQuestionBookPdf(model: QuestionBookPdfModel): Promise<SaveBlobResult> {
  let blob: Blob;

  try {
    blob = await createWrongQuestionPdfBlobFromModel(model);
  } catch (error) {
    logPdfExportError(error);
    throw new Error('試題本產生失敗，請重新嘗試。');
  }

  try {
    return await saveBlobWithPicker({
      blob,
      suggestedName: model.fileName,
      mimeType: 'application/pdf',
      extensions: ['.pdf'],
      description: 'PDF 檔案',
      useSavePicker: false,
    });
  } catch (error) {
    logPdfExportError(error);
    throw new Error('試題本儲存失敗，請確認儲存位置後再試一次。');
  }
}

function matchesAllFilter(value: string, filter: string): boolean {
  return filter === ALL || value === filter;
}

function getQuestionLearningTheme(question: Question): string {
  return (question.learningTheme || question.group).trim();
}

function toWrongQuestionPdfItem(item: QuestionBookExportItem): WrongQuestionExportItem {
  return { question: item.question, wrongCount: 0 };
}

function formatDisplayDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function formatLocalFileDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function logPdfExportError(error: unknown): void {
  if (import.meta.env.DEV) {
    console.error('[JLS question book export]', error);
  }
}
