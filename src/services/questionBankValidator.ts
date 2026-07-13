import { CSV_ROW_NUMBER_FIELD, normalizeQuestionType, parseCsvWithHeaders, toQuestion } from './csvService';
import {
  CHOICE_QUESTION_TYPE,
  ESSAY_QUESTION_TYPE,
  QUESTION_BANK_FIELDS,
  REQUIRED_QUESTION_BANK_HEADERS,
} from './questionBankFields';
import { getLearningThemeDisplayName } from './displayDictionary';
import type { QuestionBankValidationResult, ValidationIssue } from '../types/QuestionBankValidation';

const CHOICE_KEYS = new Set(['A', 'B', 'C', 'D']);
const WARNING_VALUE_FIELDS = [
  QUESTION_BANK_FIELDS.year,
  QUESTION_BANK_FIELDS.category,
  QUESTION_BANK_FIELDS.subject,
  QUESTION_BANK_FIELDS.questionNumber,
  QUESTION_BANK_FIELDS.type,
  QUESTION_BANK_FIELDS.score,
  QUESTION_BANK_FIELDS.learningTheme,
  QUESTION_BANK_FIELDS.coreConcept,
  QUESTION_BANK_FIELDS.optionA,
  QUESTION_BANK_FIELDS.optionB,
  QUESTION_BANK_FIELDS.optionC,
  QUESTION_BANK_FIELDS.optionD,
  QUESTION_BANK_FIELDS.correctAnswer,
  QUESTION_BANK_FIELDS.myAnswer,
  QUESTION_BANK_FIELDS.isCorrect,
  QUESTION_BANK_FIELDS.stemAnalysis,
  QUESTION_BANK_FIELDS.optionAAnalysis,
  QUESTION_BANK_FIELDS.optionBAnalysis,
  QUESTION_BANK_FIELDS.optionCAnalysis,
  QUESTION_BANK_FIELDS.optionDAnalysis,
  QUESTION_BANK_FIELDS.essayReferenceAnswer,
  QUESTION_BANK_FIELDS.solvingTechnique,
  QUESTION_BANK_FIELDS.confusingConcepts,
  QUESTION_BANK_FIELDS.familiarity,
  QUESTION_BANK_FIELDS.wrongCount,
  QUESTION_BANK_FIELDS.drawn,
  QUESTION_BANK_FIELDS.lastReview,
  QUESTION_BANK_FIELDS.nextReview,
  QUESTION_BANK_FIELDS.sourcePage,
  QUESTION_BANK_FIELDS.note,
  QUESTION_BANK_FIELDS.shortcutKeywords,
  QUESTION_BANK_FIELDS.coreConceptSynonyms,
  QUESTION_BANK_FIELDS.bonusConcepts,
] as const;

type CsvRow = Record<string, string>;

export function validateQuestionBankCsv(csvText: string): QuestionBankValidationResult {
  const parsedCsv = parseCsvWithHeaders(csvText);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const normalizedHeaders = new Set(parsedCsv.headers.map((header) => header.trim()));

  REQUIRED_QUESTION_BANK_HEADERS.forEach((header) => {
    if (!normalizedHeaders.has(header)) {
      errors.push({
        level: 'error',
        field: header,
        message: `缺少必要欄位：${header}`,
      });
    }
  });

  if (normalizedHeaders.has(QUESTION_BANK_FIELDS.legacyKnowledgeNode)) {
    warnings.push({
      level: 'warning',
      field: QUESTION_BANK_FIELDS.legacyKnowledgeNode,
      message: '偵測到舊欄位「知識節點」，匯入時會轉為「核心概念」。正式範本請使用「核心概念」。',
    });
  }

  const seenIds = new Set<string>();

  parsedCsv.rows.forEach((row) => {
    const rowNumber = Number(getField(row, CSV_ROW_NUMBER_FIELD)) || undefined;
    const questionId = getField(row, QUESTION_BANK_FIELDS.id);
    const questionType = normalizeQuestionType(getField(row, QUESTION_BANK_FIELDS.type));
    const correctAnswer = getField(row, QUESTION_BANK_FIELDS.correctAnswer).toUpperCase();

    addRequiredValueError(errors, row, rowNumber, questionId, QUESTION_BANK_FIELDS.stem);
    WARNING_VALUE_FIELDS.forEach((field) => addMissingValueWarning(warnings, row, rowNumber, questionId, field));

    if (questionId) {
      if (seenIds.has(questionId)) {
        warnings.push({
          level: 'warning',
          questionId,
          rowNumber,
          field: QUESTION_BANK_FIELDS.id,
          message: `題目 ID 重複：${questionId}`,
        });
      }

      seenIds.add(questionId);
    } else {
      warnings.push({
        level: 'warning',
        rowNumber,
        field: QUESTION_BANK_FIELDS.id,
        message: `ID 空白，系統會使用 Row ${rowNumber ?? 'unknown'} 作為 fallback。`,
      });
    }

    if (questionType === CHOICE_QUESTION_TYPE && correctAnswer && !CHOICE_KEYS.has(correctAnswer)) {
      warnings.push({
        level: 'warning',
        questionId,
        rowNumber,
        field: QUESTION_BANK_FIELDS.correctAnswer,
        message: '選擇題標準答案建議使用 A/B/C/D。',
      });
    }

    if (questionType === ESSAY_QUESTION_TYPE && hasChoiceOptions(row)) {
      warnings.push({
        level: 'warning',
        questionId,
        rowNumber,
        field: 'A/B/C/D',
        message: '非選題通常不需要 A/B/C/D 選項。',
      });
    }
  });

  const questions = parsedCsv.rows.map(toQuestion);
  const uniqueYears = new Set(questions.map((question) => question.year).filter(Boolean));
  const uniqueSubjects = new Set(questions.map((question) => question.subject).filter(Boolean));
  const uniqueThemes = new Set(
    questions.map((question) => getLearningThemeDisplayName(question.learningTheme || question.group)).filter(Boolean),
  );
  const uniqueCoreConcepts = new Set(questions.map((question) => question.coreConcept ?? question.knowledgeNode).filter(Boolean));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalQuestions: questions.length,
      yearCount: uniqueYears.size,
      subjectCount: uniqueSubjects.size,
      learningThemeCount: uniqueThemes.size,
      knowledgeNodeCount: uniqueCoreConcepts.size,
      choiceQuestionCount: questions.filter((question) => question.type === CHOICE_QUESTION_TYPE).length,
      essayQuestionCount: questions.filter((question) => question.type === ESSAY_QUESTION_TYPE).length,
    },
  };
}

function hasChoiceOptions(row: CsvRow): boolean {
  return [
    QUESTION_BANK_FIELDS.optionA,
    QUESTION_BANK_FIELDS.optionB,
    QUESTION_BANK_FIELDS.optionC,
    QUESTION_BANK_FIELDS.optionD,
  ].some((field) => getField(row, field).length > 0);
}

function addRequiredValueError(
  errors: ValidationIssue[],
  row: CsvRow,
  rowNumber: number | undefined,
  questionId: string,
  field: string,
): void {
  if (getField(row, field).length === 0) {
    errors.push({
      level: 'error',
      questionId: questionId || undefined,
      rowNumber,
      field,
      message: `${field} 欄位不可空白。`,
    });
  }
}

function addMissingValueWarning(
  warnings: ValidationIssue[],
  row: CsvRow,
  rowNumber: number | undefined,
  questionId: string,
  field: string,
): void {
  if (getField(row, field).length === 0) {
    warnings.push({
      level: 'warning',
      questionId: questionId || undefined,
      rowNumber,
      field,
      message: `${field} 空白，系統會使用 fallback 或略過顯示。`,
    });
  }
}

function getField(row: CsvRow, fieldName: string): string {
  return (row[fieldName] ?? '').trim();
}
