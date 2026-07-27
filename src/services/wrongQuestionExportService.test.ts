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
import * as questionBankIndexedDbService from './questionBankIndexedDbService';

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
  it('renders stem and A-D option images in the wrong-question PDF', async () => {
    const contexts = installCanvasMock();
    installImageMock({ width: 240, height: 120 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{
        question: createQuestion({
          id: 'image-q1',
          stemImage: 'data:image/png;base64,stem',
          optionAImage: 'data:image/png;base64,a',
          optionBImage: 'data:image/png;base64,b',
          optionCImage: 'data:image/png;base64,c',
          optionDImage: 'data:image/png;base64,d',
          imageNote: 'Image note',
        }),
        wrongCount: 1,
      }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    const metadata = getLastWrongQuestionPdfDebugMetadata();
    const renderedText = contexts.flatMap((context) => context.fillText.mock.calls.map((call) => String(call[0])));

    const images = metadata?.questionImages ?? [];
    const [stemImage, ...optionImages] = images;

    expect(images).toHaveLength(5);
    expect(images.every((image) => image.status === 'rendered')).toBe(true);
    expect(stemImage?.x).toBe(476);
    expect(optionImages.map((image) => image.x)).toEqual([148, 148, 148, 148]);
    expect(optionImages.every((image) => image.x < (stemImage?.x ?? 0))).toBe(true);
    expect(contexts.flatMap((context) => context.drawImage.mock.calls)).toHaveLength(5);
    expect(renderedText).toContain('Image note');
  });

  it('keeps option labels when an option only has an image', async () => {
    const contexts = installCanvasMock();
    installImageMock({ width: 160, height: 80 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{
        question: createQuestion({
          id: 'image-only-option',
          optionA: '',
          optionAImage: 'data:image/png;base64,a',
        }),
        wrongCount: 1,
      }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    const renderedText = contexts.flatMap((context) => context.fillText.mock.calls.map((call) => String(call[0])));
    const image = getLastWrongQuestionPdfDebugMetadata()?.questionImages[0];

    expect(renderedText).toContain('(A)');
    expect(image?.x).toBe(148);
    expect(image?.x).toBeGreaterThan(100);
  });

  it('centers images within the content width and does not enlarge small images', async () => {
    installCanvasMock();
    installImageMock({ width: 120, height: 60 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ stemImage: 'data:image/png;base64,small' }), wrongCount: 1 }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    const image = getLastWrongQuestionPdfDebugMetadata()?.questionImages[0];
    expect(image?.width).toBe(120);
    expect(image?.height).toBe(60);
    expect(image?.x).toBe(536);
  });

  it('shrinks oversized images proportionally and keeps them centered', async () => {
    installCanvasMock();
    installImageMock({ width: 2000, height: 1000 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ stemImage: 'data:image/png;base64,wide' }), wrongCount: 1 }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    const image = getLastWrongQuestionPdfDebugMetadata()?.questionImages[0];
    expect(image?.width).toBe(1047);
    expect(image?.height).toBe(524);
    expect(image?.x).toBe(72);
  });

  it('shrinks oversized option images using the remaining option content width', async () => {
    installCanvasMock();
    installImageMock({ width: 2000, height: 1000 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ optionAImage: 'data:image/png;base64,wide-option' }), wrongCount: 1 }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    const image = getLastWrongQuestionPdfDebugMetadata()?.questionImages[0];
    expect(image?.x).toBe(148);
    expect(image?.width).toBe(971);
    expect(image?.height).toBe(486);
    expect((image?.x ?? 0) + (image?.width ?? 0)).toBeLessThanOrEqual(1119);
  });

  it('moves an image to the next page when it does not fit in the remaining page space', async () => {
    installCanvasMock();
    installImageMock({ width: 900, height: 900 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{
        question: createQuestion({
          stem: 'Long stem '.repeat(240),
          stemImage: 'data:image/png;base64,next-page',
        }),
        wrongCount: 1,
      }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    expect(getLastWrongQuestionPdfDebugMetadata()?.questionImages[0]?.pageIndex).toBeGreaterThan(1);
  });

  it('loads IndexedDB image assets and cleans object URLs after export', async () => {
    installCanvasMock();
    installImageMock({ width: 200, height: 100 });
    const createObjectUrl = vi.fn(() => 'blob:jls-image');
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
    vi.spyOn(questionBankIndexedDbService, 'getStoredQuestionImageAsset').mockResolvedValue({
      id: 'asset-a',
      fileName: 'a.png',
      mimeType: 'image/png',
      blob: new Blob(['png'], { type: 'image/png' }),
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ optionAImage: 'jls-question-image:asset-a' }), wrongCount: 1 }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    expect(questionBankIndexedDbService.getStoredQuestionImageAsset).toHaveBeenCalledWith('asset-a');
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:jls-image');
    expect(getLastWrongQuestionPdfDebugMetadata()?.revokedObjectUrlCount).toBe(1);
  });

  it('reuses the same image source without loading it repeatedly', async () => {
    installCanvasMock();
    installImageMock({ width: 200, height: 100 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{
        question: createQuestion({
          stemImage: 'data:image/png;base64,shared',
          optionAImage: 'data:image/png;base64,shared',
        }),
        wrongCount: 1,
      }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    expect(getLastWrongQuestionPdfDebugMetadata()?.questionImages).toHaveLength(2);
    expect(getLastWrongQuestionPdfDebugMetadata()?.imageLoadCount).toBe(1);
  });

  it('renders PNG, JPEG, and WEBP image sources through the canvas pipeline', async () => {
    installCanvasMock();
    installImageMock({ width: 180, height: 90 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{
        question: createQuestion({
          stemImage: 'data:image/png;base64,png',
          optionAImage: 'data:image/jpeg;base64,jpeg',
          optionBImage: 'data:image/webp;base64,webp',
        }),
        wrongCount: 1,
      }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    expect(getLastWrongQuestionPdfDebugMetadata()?.questionImages.map((image) => image.status)).toEqual([
      'rendered',
      'rendered',
      'rendered',
    ]);
  });

  it('keeps exporting the PDF when an image cannot be loaded', async () => {
    const contexts = installCanvasMock();
    installImageMock({ width: 200, height: 100, fail: true });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ stem: 'Plain stem text', stemImage: 'data:image/png;base64,broken' }), wrongCount: 1 }],
    });

    const blob = await createWrongQuestionPdfBlobFromModel(model);

    const renderedText = contexts.flatMap((context) => context.fillText.mock.calls.map((call) => String(call[0])));
    expect(blob.type).toBe('application/pdf');
    expect(getLastWrongQuestionPdfDebugMetadata()?.questionImages[0]?.status).toBe('failed');
    expect(renderedText).toContain('\u5716\u7247\u7121\u6cd5\u8f09\u5165');
    expect(renderedText.join('')).toContain('Plain stem text');
  });

  it('does not add image metadata for questions without images', async () => {
    installCanvasMock();
    installImageMock({ width: 200, height: 100 });
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion({ id: 'no-image' }), wrongCount: 1 }],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    expect(getLastWrongQuestionPdfDebugMetadata()?.questionImages).toEqual([]);
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
  drawImage: ReturnType<typeof vi.fn>;
};

interface MockImageOptions {
  width: number;
  height: number;
  fail?: boolean;
}

function installImageMock(options: MockImageOptions): void {
  class MockImage {
    naturalWidth = options.width;
    naturalHeight = options.height;
    width = options.width;
    height = options.height;
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        if (options.fail) {
          this.onerror?.();
          return;
        }

        this.onload?.();
      });
    }
  }

  vi.stubGlobal('Image', MockImage);
}

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
    drawImage: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 12 }) as TextMetrics,
  } as unknown as MockCanvasContext;
}
