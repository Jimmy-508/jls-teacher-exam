import {
  CHOICE_QUESTION_TYPE,
  ESSAY_QUESTION_TYPE,
  QUESTION_BANK_FIELDS,
  QUESTION_BANK_TEMPLATE_HEADERS,
} from './questionBankFields';
import type { Question, QuestionType } from '../types/question';
import { getActiveQuestions } from './questionBankStorageService';

type CsvRow = Record<string, string>;
export const CSV_ROW_NUMBER_FIELD = '__csvRowNumber';

export interface ParsedCsv {
  headers: string[];
  headerRowNumber?: number;
  rows: CsvRow[];
}

const REPLACEMENT_CHARACTER = '\uFFFD';

const FIELD_ALIASES: Record<string, string> = {
  answer: QUESTION_BANK_FIELDS.correctAnswer,
  answers: QUESTION_BANK_FIELDS.correctAnswer,
  bonusconcepts: QUESTION_BANK_FIELDS.bonusConcepts,
  category: QUESTION_BANK_FIELDS.category,
  choicea: QUESTION_BANK_FIELDS.optionA,
  choiceb: QUESTION_BANK_FIELDS.optionB,
  choicec: QUESTION_BANK_FIELDS.optionC,
  choiced: QUESTION_BANK_FIELDS.optionD,
  commonmistake: QUESTION_BANK_FIELDS.confusingConcepts,
  confusingconcepts: QUESTION_BANK_FIELDS.confusingConcepts,
  coreconcept: QUESTION_BANK_FIELDS.coreConcept,
  coreconceptsynonyms: QUESTION_BANK_FIELDS.coreConceptSynonyms,
  correctanswer: QUESTION_BANK_FIELDS.correctAnswer,
  essayreferenceanswer: QUESTION_BANK_FIELDS.essayReferenceAnswer,
  id: QUESTION_BANK_FIELDS.id,
  knowledge: QUESTION_BANK_FIELDS.coreConcept,
  knowledgenode: QUESTION_BANK_FIELDS.coreConcept,
  learningtheme: QUESTION_BANK_FIELDS.learningTheme,
  node: QUESTION_BANK_FIELDS.coreConcept,
  optiona: QUESTION_BANK_FIELDS.optionA,
  optionaanalysis: QUESTION_BANK_FIELDS.optionAAnalysis,
  optionb: QUESTION_BANK_FIELDS.optionB,
  optionbanalysis: QUESTION_BANK_FIELDS.optionBAnalysis,
  optionc: QUESTION_BANK_FIELDS.optionC,
  optioncanalysis: QUESTION_BANK_FIELDS.optionCAnalysis,
  optiond: QUESTION_BANK_FIELDS.optionD,
  optiondanalysis: QUESTION_BANK_FIELDS.optionDAnalysis,
  question: QUESTION_BANK_FIELDS.stem,
  questionanalysis: QUESTION_BANK_FIELDS.stemAnalysis,
  questionnumber: QUESTION_BANK_FIELDS.questionNumber,
  referenceanswer: QUESTION_BANK_FIELDS.essayReferenceAnswer,
  score: QUESTION_BANK_FIELDS.score,
  shortcutkeyword: QUESTION_BANK_FIELDS.shortcutKeywords,
  shortcutkeywords: QUESTION_BANK_FIELDS.shortcutKeywords,
  solvingtechnique: QUESTION_BANK_FIELDS.solvingTechnique,
  solvingtip: QUESTION_BANK_FIELDS.solvingTechnique,
  stem: QUESTION_BANK_FIELDS.stem,
  stemanalysis: QUESTION_BANK_FIELDS.stemAnalysis,
  subject: QUESTION_BANK_FIELDS.subject,
  theme: QUESTION_BANK_FIELDS.learningTheme,
  type: QUESTION_BANK_FIELDS.type,
  year: QUESTION_BANK_FIELDS.year,
  核心概念: QUESTION_BANK_FIELDS.coreConcept,
  知識節點: QUESTION_BANK_FIELDS.coreConcept,
  題目: QUESTION_BANK_FIELDS.stem,
  題目分析: QUESTION_BANK_FIELDS.stemAnalysis,
  題幹分析: QUESTION_BANK_FIELDS.stemAnalysis,
  A解析: QUESTION_BANK_FIELDS.optionAAnalysis,
  B解析: QUESTION_BANK_FIELDS.optionBAnalysis,
  C解析: QUESTION_BANK_FIELDS.optionCAnalysis,
  D解析: QUESTION_BANK_FIELDS.optionDAnalysis,
  易錯提醒: QUESTION_BANK_FIELDS.confusingConcepts,
  易混淆概念: QUESTION_BANK_FIELDS.confusingConcepts,
  解題技巧: QUESTION_BANK_FIELDS.solvingTechnique,
  捷徑關鍵字: QUESTION_BANK_FIELDS.shortcutKeywords,
  核心概念同義詞: QUESTION_BANK_FIELDS.coreConceptSynonyms,
  加分概念: QUESTION_BANK_FIELDS.bonusConcepts,
};

const HEADER_DETECTION_FIELDS = new Set<string>([
  QUESTION_BANK_FIELDS.id,
  QUESTION_BANK_FIELDS.type,
  QUESTION_BANK_FIELDS.learningTheme,
  QUESTION_BANK_FIELDS.coreConcept,
  QUESTION_BANK_FIELDS.stem,
  QUESTION_BANK_FIELDS.correctAnswer,
]);

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function splitCsvRecords(csvText: string): string[] {
  const normalizedText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const records: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += char;
      current += nextChar;
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      current += char;
      continue;
    }

    if (char === '\n' && !insideQuotes) {
      if (current.trim().length > 0) {
        records.push(current);
      }

      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    records.push(current);
  }

  return records;
}

export function parseCsv(csvText: string): CsvRow[] {
  return parseCsvWithHeaders(csvText).rows;
}

export async function readQuestionBankCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8Text = decodeCsvBuffer(buffer, 'utf-8');

  if (hasReadableQuestionBankHeader(utf8Text)) {
    return utf8Text;
  }

  const big5Text = decodeCsvBuffer(buffer, 'big5');

  if (hasReadableQuestionBankHeader(big5Text)) {
    return big5Text;
  }

  return utf8Text;
}

export function parseCsvWithHeaders(csvText: string): ParsedCsv {
  const records = splitCsvRecords(csvText);
  const headerRecordIndex = findHeaderRecordIndex(records);
  const headerLine = headerRecordIndex >= 0 ? records[headerRecordIndex] : records[0];
  const dataLines = headerRecordIndex >= 0 ? records.slice(headerRecordIndex + 1) : records.slice(1);

  if (!headerLine) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = parseCsvLine(headerLine).map(normalizeCsvHeader);

  return {
    headers,
    headerRowNumber: headerRecordIndex >= 0 ? headerRecordIndex + 1 : 1,
    rows: dataLines
      .map((line, index) => {
        const values = parseCsvLine(line);

        return headers.reduce<CsvRow>((row, header, valueIndex) => {
          row[header] = values[valueIndex] ?? '';
          row[CSV_ROW_NUMBER_FIELD] = String((headerRecordIndex >= 0 ? headerRecordIndex : 0) + index + 2);
          return row;
        }, {});
      })
      .filter((row) =>
        Object.entries(row).some(([field, value]) => field !== CSV_ROW_NUMBER_FIELD && value.trim().length > 0),
      ),
  };
}

export function normalizeCsvHeader(header: string): string {
  const trimmedHeader = header.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  const compactHeader = trimmedHeader.toLowerCase().replace(/[\s_\-./()（）]/g, '');

  return FIELD_ALIASES[compactHeader] ?? FIELD_ALIASES[trimmedHeader] ?? trimmedHeader;
}

export function normalizeQuestionType(value: string): QuestionType {
  const normalizedValue = value.trim().toLowerCase();
  const choiceValues = new Set(['choice', 'multiplechoice', 'singlechoice', '選擇', '選擇題', '單選', '單選題']);

  return choiceValues.has(normalizedValue) ? CHOICE_QUESTION_TYPE : ESSAY_QUESTION_TYPE;
}

function getField(row: CsvRow, fieldName: string): string {
  return row[fieldName] ?? '';
}

export function toQuestion(row: CsvRow): Question {
  const questionType = normalizeQuestionType(getField(row, QUESTION_BANK_FIELDS.type));
  const fallbackId = getField(row, CSV_ROW_NUMBER_FIELD) || getField(row, QUESTION_BANK_FIELDS.questionNumber) || 'unknown';
  const learningTheme = getField(row, QUESTION_BANK_FIELDS.learningTheme) || '未分類主題';
  const coreConcept = getField(row, QUESTION_BANK_FIELDS.coreConcept) || '未分類核心概念';
  const score = Number(getField(row, QUESTION_BANK_FIELDS.score)) || (questionType === CHOICE_QUESTION_TYPE ? 1 : 0);
  const shortcutKeywords = getField(row, QUESTION_BANK_FIELDS.shortcutKeywords) || undefined;
  const confusingConcepts = getField(row, QUESTION_BANK_FIELDS.confusingConcepts) || undefined;
  const solvingTechnique = getField(row, QUESTION_BANK_FIELDS.solvingTechnique) || undefined;

  return {
    id: getField(row, QUESTION_BANK_FIELDS.id) || fallbackId,
    year: getField(row, QUESTION_BANK_FIELDS.year) || 'unknown',
    category: getField(row, QUESTION_BANK_FIELDS.category) || '未分類類科',
    subject: getField(row, QUESTION_BANK_FIELDS.subject) || '未分類科目',
    questionNumber: getField(row, QUESTION_BANK_FIELDS.questionNumber) || fallbackId,
    type: questionType,
    score,
    group: learningTheme,
    learningTheme,
    coreConcept,
    knowledgeNode: coreConcept,
    stem: getField(row, QUESTION_BANK_FIELDS.stem),
    optionA: getField(row, QUESTION_BANK_FIELDS.optionA) || undefined,
    optionB: getField(row, QUESTION_BANK_FIELDS.optionB) || undefined,
    optionC: getField(row, QUESTION_BANK_FIELDS.optionC) || undefined,
    optionD: getField(row, QUESTION_BANK_FIELDS.optionD) || undefined,
    correctAnswer: getField(row, QUESTION_BANK_FIELDS.correctAnswer).trim().toUpperCase(),
    myAnswer: getField(row, QUESTION_BANK_FIELDS.myAnswer) || undefined,
    isCorrect: getField(row, QUESTION_BANK_FIELDS.isCorrect) || undefined,
    stemAnalysis: getField(row, QUESTION_BANK_FIELDS.stemAnalysis) || undefined,
    optionAAnalysis: getField(row, QUESTION_BANK_FIELDS.optionAAnalysis) || undefined,
    optionBAnalysis: getField(row, QUESTION_BANK_FIELDS.optionBAnalysis) || undefined,
    optionCAnalysis: getField(row, QUESTION_BANK_FIELDS.optionCAnalysis) || undefined,
    optionDAnalysis: getField(row, QUESTION_BANK_FIELDS.optionDAnalysis) || undefined,
    essayReferenceAnswer: getField(row, QUESTION_BANK_FIELDS.essayReferenceAnswer) || undefined,
    solvingTechnique,
    solvingTip: solvingTechnique,
    confusingConcepts,
    commonMistake: confusingConcepts,
    familiarity: getField(row, QUESTION_BANK_FIELDS.familiarity) || undefined,
    wrongCount: getField(row, QUESTION_BANK_FIELDS.wrongCount) || undefined,
    drawn: getField(row, QUESTION_BANK_FIELDS.drawn) || undefined,
    lastReview: getField(row, QUESTION_BANK_FIELDS.lastReview) || undefined,
    nextReview: getField(row, QUESTION_BANK_FIELDS.nextReview) || undefined,
    sourcePage: getField(row, QUESTION_BANK_FIELDS.sourcePage) || undefined,
    note: getField(row, QUESTION_BANK_FIELDS.note) || undefined,
    shortcutKeywords,
    shortcutKeyword: shortcutKeywords,
    coreConceptSynonyms: getField(row, QUESTION_BANK_FIELDS.coreConceptSynonyms) || undefined,
    bonusConcepts: getField(row, QUESTION_BANK_FIELDS.bonusConcepts) || undefined,
  };
}

export async function loadQuestions(): Promise<Question[]> {
  return getActiveQuestions();
}

function findHeaderRecordIndex(records: string[]): number {
  const maxScanCount = Math.min(records.length, 5);

  for (let index = 0; index < maxScanCount; index += 1) {
    const normalizedHeaders = parseCsvLine(records[index]).map(normalizeCsvHeader);
    const detectedFieldCount = normalizedHeaders.filter((header) => HEADER_DETECTION_FIELDS.has(header)).length;
    const templateFieldCount = normalizedHeaders.filter((header) =>
      QUESTION_BANK_TEMPLATE_HEADERS.includes(header as (typeof QUESTION_BANK_TEMPLATE_HEADERS)[number]),
    ).length;

    if (detectedFieldCount >= 2 || templateFieldCount >= 5) {
      return index;
    }
  }

  return records.length > 0 ? 0 : -1;
}

function decodeCsvBuffer(buffer: ArrayBuffer, encoding: string): string {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function hasReadableQuestionBankHeader(csvText: string): boolean {
  if (csvText.includes(REPLACEMENT_CHARACTER)) {
    return false;
  }

  const parsedCsv = parseCsvWithHeaders(csvText);
  const headerSet = new Set(parsedCsv.headers);

  return (
    headerSet.has(QUESTION_BANK_FIELDS.stem) &&
    headerSet.has(QUESTION_BANK_FIELDS.learningTheme) &&
    headerSet.has(QUESTION_BANK_FIELDS.coreConcept)
  );
}
