import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question } from '../types/question';

const activeQuestions = vi.hoisted(() => ({
  value: [] as Question[],
}));

vi.mock('./questionBankStorageService', () => ({
  getActiveQuestions: vi.fn(async () => activeQuestions.value),
}));

import { loadQuestions, parseCsv, parseCsvWithHeaders, readQuestionBankCsvFile, toQuestion } from './csvService';
import {
  CHOICE_QUESTION_TYPE,
  ESSAY_QUESTION_TYPE,
  QUESTION_BANK_FIELDS,
  QUESTION_BANK_TEMPLATE_HEADERS,
} from './questionBankFields';
import { getActiveQuestions } from './questionBankStorageService';

describe('csvService', () => {
  beforeEach(() => {
    activeQuestions.value = parseCsv(createCsv('PUBLIC_Q1')).map(toQuestion);
  });

  it('loads questions from active imported question bank', async () => {
    activeQuestions.value = parseCsv(createCsv('IMPORTED_Q1')).map(toQuestion);

    const questions = await loadQuestions();

    expect(getActiveQuestions).toHaveBeenCalled();
    expect(questions.map((question) => question.id)).toEqual(['IMPORTED_Q1']);
  });

  it('loads questions from active default question bank', async () => {
    const questions = await loadQuestions();

    expect(questions.map((question) => question.id)).toEqual(['PUBLIC_Q1']);
  });

  it('detects the header row after leading note rows', () => {
    const csv = ['JLS 題庫', '匯入說明', createCsv('Q_AFTER_NOTE')].join('\n');
    const parsedCsv = parseCsvWithHeaders(csv);

    expect(parsedCsv.headerRowNumber).toBe(3);
    expect(parsedCsv.rows).toHaveLength(1);
    expect(toQuestion(parsedCsv.rows[0]).id).toBe('Q_AFTER_NOTE');
  });

  it('normalizes header whitespace and BOM', () => {
    const csv = `\uFEFF ${QUESTION_BANK_FIELDS.id} , ${QUESTION_BANK_FIELDS.type} , ${QUESTION_BANK_FIELDS.stem} \nQ001,choice,題幹`;
    const [question] = parseCsv(csv).map(toQuestion);

    expect(question.id).toBe('Q001');
    expect(question.type).toBe(CHOICE_QUESTION_TYPE);
    expect(question.stem).toBe('題幹');
  });

  it('ignores empty data rows', () => {
    const csv = `${createCsv('Q001')}\n,,,,,,,,,,,,,,\n`;

    expect(parseCsv(csv)).toHaveLength(1);
  });

  it('normalizes unknown and blank question types to essay', () => {
    const headers = [QUESTION_BANK_FIELDS.id, QUESTION_BANK_FIELDS.type, QUESTION_BANK_FIELDS.stem];
    const rows = ['Q001,unknown,題幹', 'Q002,,題幹'];
    const questions = parseCsv([headers.join(','), ...rows].join('\n')).map(toQuestion);

    expect(questions.map((question) => question.type)).toEqual([ESSAY_QUESTION_TYPE, ESSAY_QUESTION_TYPE]);
  });

  it('normalizes invisible characters in subject names while importing questions', () => {
    const headers = [QUESTION_BANK_FIELDS.id, QUESTION_BANK_FIELDS.subject, QUESTION_BANK_FIELDS.type, QUESTION_BANK_FIELDS.stem];
    const [question] = parseCsv([headers.join(','), 'Q001,\uFEFF教育原理與制度\u200B,choice,題幹'].join('\n')).map(toQuestion);

    expect(question.subject).toBe('教育原理與制度');
  });

  it('imports the actual 25-column schema by header name', () => {
    const csv = [QUESTION_BANK_TEMPLATE_HEADERS.join(','), createFullRow('Q025', '測驗', '題幹有內容')].join('\n');
    const [question] = parseCsv(csv).map(toQuestion);

    expect(question.id).toBe('Q025');
    expect(question.learningTheme).toBe('測驗');
    expect(question.knowledgeNode).toBe('信度');
    expect(question.stem).toBe('題幹有內容');
  });

  it('decodes Big5 / CP950 CSV and reads Chinese headers', async () => {
    const cp950Bytes = new Uint8Array([
      0x49, 0x44, 0x2c, 0xc3, 0xfe, 0xa7, 0x4f, 0x2c, 0xaa, 0xbe, 0xc3, 0xd1, 0xb8, 0x60, 0xc2, 0x49,
      0x2c, 0xc3, 0x44, 0xb7, 0x46, 0x2c, 0xbc, 0xd0, 0xb7, 0xc7, 0xb5, 0xaa, 0xae, 0xd7, 0x0d, 0x0a,
      0x51, 0x30, 0x30, 0x31, 0x2c, 0xb4, 0xfa, 0xc5, 0xe7, 0x2c, 0xab, 0x48, 0xab, 0xd7, 0x2c, 0xc3,
      0x44, 0xb7, 0x46, 0xa4, 0xba, 0xae, 0x65, 0x2c, 0x41,
    ]);
    const file = new File([cp950Bytes], 'big5.csv', { type: 'text/csv' });
    const csvText = await readQuestionBankCsvFile(file);
    const [question] = parseCsv(csvText).map(toQuestion);

    expect(question.learningTheme).toBe('測驗');
    expect(question.knowledgeNode).toBe('信度');
    expect(question.stem).toBe('題幹內容');
  });
});

function createCsv(id: string): string {
  const headers = [
    QUESTION_BANK_FIELDS.id,
    QUESTION_BANK_FIELDS.year,
    QUESTION_BANK_FIELDS.category,
    QUESTION_BANK_FIELDS.subject,
    QUESTION_BANK_FIELDS.questionNumber,
    QUESTION_BANK_FIELDS.type,
    QUESTION_BANK_FIELDS.score,
    QUESTION_BANK_FIELDS.learningTheme,
    QUESTION_BANK_FIELDS.knowledgeNode,
    QUESTION_BANK_FIELDS.stem,
    QUESTION_BANK_FIELDS.optionA,
    QUESTION_BANK_FIELDS.optionB,
    QUESTION_BANK_FIELDS.optionC,
    QUESTION_BANK_FIELDS.optionD,
    QUESTION_BANK_FIELDS.correctAnswer,
  ];
  const row = [
    id,
    '113',
    '國小',
    '教育原理',
    '1',
    CHOICE_QUESTION_TYPE,
    '2',
    '教育法規',
    '教育基本法',
    '下列何者正確？',
    'A選項',
    'B選項',
    'C選項',
    'D選項',
    'A',
  ];

  return `${headers.join(',')}\n${row.join(',')}`;
}

function createFullRow(id: string, learningTheme: string, stem: string): string {
  return [
    id,
    '113',
    '國小',
    '教育原理',
    '1',
    CHOICE_QUESTION_TYPE,
    '2',
    learningTheme,
    '信度',
    stem,
    'A選項',
    'B選項',
    'C選項',
    'D選項',
    'A',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ].join(',');
}
