import { describe, expect, it } from 'vitest';
import { parseCsv, toQuestion } from './csvService';
import { buildQuestionBankSummary } from './questionBankSummary';
import {
  CHOICE_QUESTION_TYPE,
  ESSAY_QUESTION_TYPE,
  QUESTION_BANK_FIELDS,
  QUESTION_BANK_TEMPLATE_HEADERS,
} from './questionBankFields';
import { validateQuestionBankCsv } from './questionBankValidator';

const header = QUESTION_BANK_TEMPLATE_HEADERS.join(',');
const latestSchema =
  'ID,年度,類科,科目,題號,題型,分數,類別,核心概念,題幹,A,B,C,D,標準答案,我的答案,是否答對,題幹分析,A解析,B解析,C解析,D解析,非選參考答案,解題技巧,易混淆概念,熟悉度,錯誤次數,已抽過,最後複習,下次複習,來源頁,備註,捷徑關鍵字,核心概念同義詞,加分概念';

describe('questionBankValidator', () => {
  it('exports the latest 33-column CSV template order', () => {
    expect(header).toBe(latestSchema);
  });

  it('allows the exported template to be re-imported', () => {
    const result = validateQuestionBankCsv(`${header}\n`);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.totalQuestions).toBe(0);
  });

  it('errors clearly when required headers are missing', () => {
    const result = validateQuestionBankCsv('ID,題幹\nQ001,題幹有內容');

    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.message.includes('缺少必要欄位'))).toBe(true);
    expect(result.errors.some((issue) => issue.field === QUESTION_BANK_FIELDS.learningTheme)).toBe(true);
  });

  it('does not report stem blank when row["題幹"] has content', () => {
    const result = validateQuestionBankCsv([header, validChoiceRow({})].join('\n'));

    expect(result.errors.some((issue) => issue.field === QUESTION_BANK_FIELDS.stem)).toBe(false);
  });

  it('treats blank non-stem fields as warnings only', () => {
    const row = makeRow({
      [QUESTION_BANK_FIELDS.id]: 'Q001',
      [QUESTION_BANK_FIELDS.stem]: '題幹有內容',
    });
    const result = validateQuestionBankCsv([header, row].join('\n'));

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('normalizes choice and essay question types', () => {
    const csv = [
      header,
      validChoiceRow({ [QUESTION_BANK_FIELDS.type]: '選擇題' }),
      validEssayRow({ [QUESTION_BANK_FIELDS.id]: 'E001', [QUESTION_BANK_FIELDS.type]: '申論題' }),
      validEssayRow({ [QUESTION_BANK_FIELDS.id]: 'E002', [QUESTION_BANK_FIELDS.type]: '' }),
    ].join('\n');
    const questions = parseCsv(csv).map(toQuestion);

    expect(questions.map((question) => question.type)).toEqual([
      CHOICE_QUESTION_TYPE,
      ESSAY_QUESTION_TYPE,
      ESSAY_QUESTION_TYPE,
    ]);
  });

  it('imports offline explanation fields by header name', () => {
    const [question] = parseCsv([header, validChoiceRow({})].join('\n')).map(toQuestion);

    expect(question.stemAnalysis).toBe('本題考教育基本法。');
    expect(question.optionAAnalysis).toBe('A 選項解析');
    expect(question.optionBAnalysis).toBe('B 選項解析');
    expect(question.optionCAnalysis).toBe('C 選項解析');
    expect(question.optionDAnalysis).toBe('D 選項解析');
    expect(question.solvingTip).toBe('先抓題幹關鍵詞。');
    expect(question.commonMistake).toBe('容易混淆法源位階。');
  });

  it('imports essay reference answer from the shared CSV format', () => {
    const [question] = parseCsv([header, validEssayRow({})].join('\n')).map(toQuestion);

    expect(question.type).toBe(ESSAY_QUESTION_TYPE);
    expect(question.essayReferenceAnswer).toBe('非選參考答案內容');
  });

  it('counts LearningThemes and KnowledgeNodes correctly', () => {
    const rows = [
      validChoiceRow({ [QUESTION_BANK_FIELDS.id]: 'Q001', [QUESTION_BANK_FIELDS.learningTheme]: '測驗' }),
      validChoiceRow({ [QUESTION_BANK_FIELDS.id]: 'Q002', [QUESTION_BANK_FIELDS.learningTheme]: '測驗' }),
      validChoiceRow({ [QUESTION_BANK_FIELDS.id]: 'Q003', [QUESTION_BANK_FIELDS.learningTheme]: '課程' }),
    ];
    const questions = parseCsv([header, ...rows].join('\n')).map(toQuestion);
    const summary = buildQuestionBankSummary(questions);

    expect(summary.byLearningTheme['教育測驗與評量']).toBe(2);
    expect(summary.byLearningTheme['課程發展與設計']).toBe(1);
    expect(summary.byKnowledgeNode['教育基本法']).toBe(3);
  });

  it('parser handles BOM, empty lines, and quoted commas', () => {
    const csv = `\uFEFF${header}\n\n${validChoiceRow({ [QUESTION_BANK_FIELDS.stem]: '題幹, 含逗號' })}\n`;
    const [question] = parseCsv(csv).map(toQuestion);

    expect(question.id).toBe('Q001');
    expect(question.stem).toBe('題幹, 含逗號');
  });
});

function validChoiceRow(overrides: Record<string, string>): string {
  return makeRow({
    [QUESTION_BANK_FIELDS.id]: 'Q001',
    [QUESTION_BANK_FIELDS.year]: '113',
    [QUESTION_BANK_FIELDS.category]: '教檢',
    [QUESTION_BANK_FIELDS.subject]: '教育原理',
    [QUESTION_BANK_FIELDS.questionNumber]: '1',
    [QUESTION_BANK_FIELDS.type]: '選擇題',
    [QUESTION_BANK_FIELDS.score]: '2',
    [QUESTION_BANK_FIELDS.learningTheme]: '教育法規',
    [QUESTION_BANK_FIELDS.knowledgeNode]: '教育基本法',
    [QUESTION_BANK_FIELDS.stem]: '題幹有內容',
    [QUESTION_BANK_FIELDS.optionA]: '選項 A',
    [QUESTION_BANK_FIELDS.optionB]: '選項 B',
    [QUESTION_BANK_FIELDS.optionC]: '選項 C',
    [QUESTION_BANK_FIELDS.optionD]: '選項 D',
    [QUESTION_BANK_FIELDS.correctAnswer]: 'B',
    [QUESTION_BANK_FIELDS.stemAnalysis]: '本題考教育基本法。',
    [QUESTION_BANK_FIELDS.optionAAnalysis]: 'A 選項解析',
    [QUESTION_BANK_FIELDS.optionBAnalysis]: 'B 選項解析',
    [QUESTION_BANK_FIELDS.optionCAnalysis]: 'C 選項解析',
    [QUESTION_BANK_FIELDS.optionDAnalysis]: 'D 選項解析',
    [QUESTION_BANK_FIELDS.solvingTip]: '先抓題幹關鍵詞。',
    [QUESTION_BANK_FIELDS.commonMistake]: '容易混淆法源位階。',
    ...overrides,
  });
}

function validEssayRow(overrides: Record<string, string>): string {
  return makeRow({
    [QUESTION_BANK_FIELDS.id]: 'E001',
    [QUESTION_BANK_FIELDS.year]: '113',
    [QUESTION_BANK_FIELDS.category]: '教檢',
    [QUESTION_BANK_FIELDS.subject]: '教育原理',
    [QUESTION_BANK_FIELDS.questionNumber]: '2',
    [QUESTION_BANK_FIELDS.type]: '非選題',
    [QUESTION_BANK_FIELDS.score]: '25',
    [QUESTION_BANK_FIELDS.learningTheme]: '教育法規',
    [QUESTION_BANK_FIELDS.knowledgeNode]: '教育基本法',
    [QUESTION_BANK_FIELDS.stem]: '請說明教育基本法重點。',
    [QUESTION_BANK_FIELDS.essayReferenceAnswer]: '非選參考答案內容',
    [QUESTION_BANK_FIELDS.stemAnalysis]: '本題考法規理解與應用。',
    [QUESTION_BANK_FIELDS.solvingTip]: '先列核心概念再補例子。',
    [QUESTION_BANK_FIELDS.commonMistake]: '避免只背條文。',
    ...overrides,
  });
}

function makeRow(values: Record<string, string>): string {
  return QUESTION_BANK_TEMPLATE_HEADERS.map((headerName) => csvEscape(values[headerName] ?? '')).join(',');
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
