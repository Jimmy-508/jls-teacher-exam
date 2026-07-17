import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from './questionBankFields';
import {
  buildWrongQuestionFilterOptions,
  buildWrongQuestionPdfModel,
  compareSubjects,
  createWrongQuestionPdfBlobFromModel,
  filterWrongChoiceQuestions,
  formatWrongQuestionPdfDateRange,
  getAllFilterValue,
  getLastWrongQuestionPdfDebugMetadata,
  getWrongQuestionDateFilterError,
  normalizeChoiceAnswer,
  sortWrongQuestionExportItems,
} from './wrongQuestionExportService';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';
import type { WrongQuestionFilters } from '../types/WrongQuestionExport';

describe('wrongQuestionExportService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('filters wrong choice questions by selected fields and excludes essays', () => {
    const questions = [
      createQuestion({ id: 'q1', year: '113', subject: '教育原理與制度', learningTheme: '性別教育' }),
      createQuestion({ id: 'q2', year: '113', subject: '教育原理與制度', learningTheme: '性別教育' }),
      createQuestion({ id: 'q3', year: '114', subject: '青少年發展與輔導', learningTheme: '輔導理論' }),
      createQuestion({ id: 'e1', year: '113', subject: '教育原理與制度', learningTheme: '性別教育', type: ESSAY_QUESTION_TYPE }),
    ];
    const records = {
      q1: createRecord('q1', 0, true),
      q2: createRecord('q2', 2, false),
      q3: createRecord('q3', 1, false),
      e1: createRecord('e1', 3, false),
    };

    const result = filterWrongChoiceQuestions(questions, records, createFilters({
      year: '113',
      subject: '教育原理與制度',
      learningTheme: getAllFilterValue(),
    }));

    expect(result.map((item) => item.question.id)).toEqual(['q2']);
  });

  it('keeps questions that were later correct when wrongCount remains greater than zero', () => {
    const question = createQuestion({ id: 'q1' });
    const result = filterWrongChoiceQuestions([question], { q1: createRecord('q1', 1, true) }, createFilters());

    expect(result).toHaveLength(1);
  });

  it('excludes questions without a valid standard answer from wrong-question export', () => {
    const question = createQuestion({ id: 'q1', correctAnswer: '' });
    const result = filterWrongChoiceQuestions([question], { q1: createRecord('q1', 3, false) }, createFilters());

    expect(result).toHaveLength(0);
  });

  it('builds year options from actual data with all fixed first', () => {
    const questions = [
      createQuestion({ id: 'q1', year: '106' }),
      createQuestion({ id: 'q2', year: '115' }),
      createQuestion({ id: 'q3', year: '108-1' }),
      createQuestion({ id: 'q4', year: '' }),
      createQuestion({ id: 'q5', year: '108-2' }),
      createQuestion({ id: 'q6', year: '109' }),
      createQuestion({ id: 'q7', year: '94' }),
      createQuestion({ id: 'q8', year: '108-2' }),
    ];

    expect(buildWrongQuestionFilterOptions(questions, createFilters()).years).toEqual([
      getAllFilterValue(),
      '115',
      '109',
      '108-2',
      '108-1',
      '106',
      '94',
    ]);
    expect(buildWrongQuestionFilterOptions(questions, createFilters()).years).not.toContain('107');
  });

  it('lists only learning themes that have wrong choice questions', () => {
    const questions = [
      createQuestion({ id: 'q1', learningTheme: 'Beta' }),
      createQuestion({ id: 'q2', learningTheme: 'Alpha' }),
      createQuestion({ id: 'q3', learningTheme: '性別教育' }),
      createQuestion({ id: 'q4', learningTheme: '課程理論' }),
      createQuestion({ id: 'e1', learningTheme: 'EssayTheme', type: ESSAY_QUESTION_TYPE }),
    ];
    const records = {
      q1: createRecord('q1', 2, false),
      q2: createRecord('q2', 1, false),
      q3: createRecord('q3', 3, false),
      q4: createRecord('q4', 0, true),
      e1: createRecord('e1', 4, false),
    };

    const options = buildWrongQuestionFilterOptions(questions, createFilters(), records);

    expect(options.learningThemes).toEqual([getAllFilterValue(), 'Alpha', 'Beta', '性別教育']);
  });

  it('sorts subjects with Chinese-language subjects fixed last', () => {
    expect(['國語文能力測驗', '教育原理與制度', '中等學校課程與教學', '未分類科目'].sort(compareSubjects)).toEqual([
      '中等學校課程與教學',
      '教育原理與制度',
      '未分類科目',
      '國語文能力測驗',
    ]);
  });

  it('normalizes choice answers', () => {
    expect(normalizeChoiceAnswer('B')).toBe('(B)');
    expect(normalizeChoiceAnswer('(c)')).toBe('(C)');
    expect(normalizeChoiceAnswer('')).toBe('(未提供)');
  });

  it('validates answer date filters', () => {
    expect(getWrongQuestionDateFilterError(createFilters({ startDate: '', endDate: '2026-07-17' }))).toBe(
      '請完整選擇起日與迄日。',
    );
    expect(getWrongQuestionDateFilterError(createFilters({ startDate: '2026-07-18', endDate: '2026-07-17' }))).toBe(
      '起日不可晚於迄日。',
    );
    expect(getWrongQuestionDateFilterError(createFilters({ startDate: '2026-07-17', endDate: '2026-07-17' }))).toBe('');
  });

  it('formats compact PDF date ranges for title display', () => {
    expect(formatWrongQuestionPdfDateRange('2026-07-17', '2026-07-17')).toBe('07/17');
    expect(formatWrongQuestionPdfDateRange('2026-07-01', '2026-07-17')).toBe('07/01~07/17');
    expect(formatWrongQuestionPdfDateRange('2026-06-28', '2026-07-17')).toBe('06/28~07/17');
    expect(formatWrongQuestionPdfDateRange('2025-12-20', '2026-01-10')).toBe('2025/12/20~2026/01/10');
  });

  it('uses compact date labels for PDF title and preserves filename dates', () => {
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ id: 'q1' }), wrongCount: 1 }],
      filters: createFilters({ startDate: '2026-07-17', endDate: '2026-07-17' }),
      now: new Date('2026-07-12T00:00:00'),
    });

    expect(model.title).toBe('Jimmy的錯題本 07/17');
    expect(model.formattedExportDate).toBe('07/17');
    expect(model.fileName).toBe('Jimmy_錯題本_2026-07-17.pdf');
  });

  it('uses compact date ranges for PDF title and keeps file date keys', () => {
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ id: 'q1' }), wrongCount: 1 }],
      filters: createFilters({ startDate: '2026-07-01', endDate: '2026-07-17' }),
      now: new Date('2026-07-12T00:00:00'),
    });

    expect(model.title).toBe('Jimmy的錯題本 07/01~07/17');
    expect(model.fileName).toBe('Jimmy_錯題本_2026-07-01_至_2026-07-17.pdf');
  });

  it('sorts PDF items by newest year, subject, and numeric question number', () => {
    const sortedItems = sortWrongQuestionExportItems([
      { question: createQuestion({ id: 'q10', year: '108-1', subject: '教育原理與制度', questionNumber: '10' }), wrongCount: 1 },
      { question: createQuestion({ id: 'q2', year: '108-2', subject: '教育原理與制度', questionNumber: '2' }), wrongCount: 1 },
      { question: createQuestion({ id: 'qLang', year: '115', subject: '國語文能力測驗', questionNumber: '1' }), wrongCount: 1 },
      { question: createQuestion({ id: 'qOld', year: '106', subject: '教育原理與制度', questionNumber: '1' }), wrongCount: 1 },
    ]);

    expect(sortedItems.map((item) => item.question.id)).toEqual(['qLang', 'q2', 'q10', 'qOld']);
  });

  it('renders PDF metadata with forced analysis page, compact title date, and answer hanging indent', async () => {
    const contexts = installCanvasMock();
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      now: new Date('2026-07-12T00:00:00'),
      items: Array.from({ length: 6 }, (_, index) => ({
        question: createQuestion({
          id: `q${index + 1}`,
          year: '115',
          questionNumber: String(index + 1),
          stem: `第 ${index + 1} 題題幹`,
        }),
        wrongCount: 1,
      })),
    });

    await createWrongQuestionPdfBlobFromModel(model);
    const metadata = getLastWrongQuestionPdfDebugMetadata();
    const renderedText = contexts.flatMap((context) =>
      context.fillText.mock.calls.map((call) => String(call[0])),
    );
    const answerPosition = metadata?.analysisBlockPositions.find((position) => position.kind === 'analysisAnswer');
    const stemPosition = metadata?.analysisBlockPositions.find((position) => position.kind === 'analysisContent');
    const optionPosition = metadata?.analysisBlockPositions.find((position) => position.kind === 'analysisOption');

    expect(metadata?.renderedQuestionTitle).toBe('Jimmy的錯題本 07/12');
    expect(metadata?.renderedAnalysisTitle).toBe('錯題本解析 07/12');
    expect(metadata?.questionTitleDateFontPt).toBe(metadata?.analysisTitleDateFontPt);
    expect(metadata?.analysisTitleDateFontPt).toBeLessThan(14);
    expect(metadata?.analysisStartPageIndex).toBeGreaterThan(metadata?.questionPages ?? 0);
    expect((answerPosition?.hangingLineX ?? 0) - (answerPosition?.firstLineX ?? 0)).toBe(24);
    expect(stemPosition?.firstLineX).toBeGreaterThan(answerPosition?.firstLineX ?? 0);
    expect(optionPosition?.firstLineX).toBeGreaterThan(answerPosition?.firstLineX ?? 0);
    expect(renderedText).toContain('錯題本解析');
    expect(renderedText).toContain('07/12');
    expect(renderedText).not.toContain('解析：');
  });
});

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    year: '115',
    category: '中等學校',
    subject: '教育原理與制度',
    questionNumber: '1',
    type: CHOICE_QUESTION_TYPE,
    score: 2,
    group: '性別教育',
    learningTheme: '性別教育',
    knowledgeNode: '性別教育',
    stem: '題幹',
    optionA: '選項A',
    optionB: '選項B',
    optionC: '選項C',
    optionD: '選項D',
    correctAnswer: 'B',
    stemAnalysis: '題幹解析',
    optionAAnalysis: 'A解析',
    optionBAnalysis: 'B解析',
    optionCAnalysis: 'C解析',
    optionDAnalysis: 'D解析',
    solvingTechnique: '解題技巧',
    confusingConcepts: '易混淆概念',
    ...overrides,
  };
}

function createRecord(
  questionId: string,
  wrongCount: number,
  lastCorrect: boolean,
  attemptedAt = '2026-07-12T00:00:00.000Z',
): LearningRecord {
  return {
    id: questionId,
    learningTheme: '',
    knowledgeNode: '',
    mastery: 0,
    masteredCount: 0,
    missingCount: 0,
    recentMissing: [],
    updatedAt: '2026-07-12T00:00:00.000Z',
    questionId,
    lastCorrect,
    correctCount: lastCorrect ? 1 : 0,
    wrongCount,
    familiarity: 0,
    reviewCount: 1,
    viewedAI: false,
    attempts: [
      {
        attemptedAt,
        selectedAnswer: lastCorrect ? 'B' : 'A',
        isCorrect: lastCorrect,
      },
    ],
  };
}

function createFilters(overrides: Partial<WrongQuestionFilters> = {}): WrongQuestionFilters {
  return {
    year: getAllFilterValue(),
    subject: getAllFilterValue(),
    learningTheme: getAllFilterValue(),
    startDate: '2026-07-12',
    endDate: '2026-07-12',
    ...overrides,
  };
}

function installCanvasMock() {
  const contexts: Array<MockCanvasContext> = [];

  vi.stubGlobal('document', {
    fonts: { ready: Promise.resolve() },
    createElement: (tagName: string) => {
      if (tagName !== 'canvas') {
        return {};
      }

      const context = createMockCanvasContext();
      contexts.push(context);

      return {
        width: 0,
        height: 0,
        getContext: () => context,
        toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })),
      };
    },
  });

  return contexts;
}

type MockCanvasContext = CanvasRenderingContext2D & {
  fillText: ReturnType<typeof vi.fn>;
};

function createMockCanvasContext(): MockCanvasContext {
  return {
    canvas: {} as HTMLCanvasElement,
    font: '',
    fillStyle: '',
    textAlign: 'left',
    textBaseline: 'top',
    direction: 'ltr',
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 12 }) as TextMetrics,
  } as unknown as MockCanvasContext;
}
