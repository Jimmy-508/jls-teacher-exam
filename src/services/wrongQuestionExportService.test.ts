import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from './questionBankFields';
import {
  buildWrongQuestionFilterOptions,
  buildWrongQuestionPdfModel,
  createWrongQuestionPdfBlob,
  createWrongQuestionPdfBlobFromModel,
  compareSubjects,
  filterWrongChoiceQuestions,
  formatLocalExportDate,
  formatQuestionHeading,
  getLastWrongQuestionPdfDebugMetadata,
  getAllFilterValue,
  normalizeChoiceAnswer,
  validateGeneratedPdf,
} from './wrongQuestionExportService';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';

describe('wrongQuestionExportService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('filters wrong choice questions by wrongCount and selected fields', () => {
    const questions = [
      createQuestion('q1', '113', '教育理念與實務', '評量', '1', CHOICE_QUESTION_TYPE),
      createQuestion('q2', '113', '教育理念與實務', '評量', '2', CHOICE_QUESTION_TYPE),
      createQuestion('q3', '114', '課程教學與評量', '課程', '3', CHOICE_QUESTION_TYPE),
      createQuestion('e1', '113', '教育理念與實務', '評量', '4', ESSAY_QUESTION_TYPE),
    ];
    const records = {
      q1: createRecord('q1', 0, true),
      q2: createRecord('q2', 2, true),
      q3: createRecord('q3', 1, false),
      e1: createRecord('e1', 3, false),
    };

    const result = filterWrongChoiceQuestions(questions, records, {
      year: '113',
      subject: '教育理念與實務',
      learningTheme: getAllFilterValue(),
    });

    expect(result.map((item) => item.question.id)).toEqual(['q2']);
  });

  it('keeps questions that were later correct when wrongCount remains greater than zero', () => {
    const question = createQuestion('q1', '113', '教育理念與實務', '評量', '1', CHOICE_QUESTION_TYPE);
    const result = filterWrongChoiceQuestions([question], { q1: createRecord('q1', 1, true) }, {
      year: getAllFilterValue(),
      subject: getAllFilterValue(),
      learningTheme: getAllFilterValue(),
    });

    expect(result).toHaveLength(1);
  });

  it('sorts subject options by fixed JLS order while hiding missing subjects', () => {
    const questions = [
      createQuestion('q1', '113', '國語文能力測驗', '國文', '1', CHOICE_QUESTION_TYPE),
      createQuestion('q2', '113', '教育理念與實務', '理念', '2', CHOICE_QUESTION_TYPE),
      createQuestion('q3', '113', '新科目', '新主題', '3', CHOICE_QUESTION_TYPE),
      createQuestion('q4', '114', '課程教學與評量', '課程', '4', CHOICE_QUESTION_TYPE),
    ];

    const options = buildWrongQuestionFilterOptions(questions, {
      year: '113',
      subject: getAllFilterValue(),
      learningTheme: getAllFilterValue(),
    });

    expect(options.subjects).toEqual([getAllFilterValue(), '教育理念與實務', '國語文能力測驗', '新科目']);
    expect(options.subjects).not.toContain('課程教學與評量');
    expect(['教育理念與實務', '課程教學與評量', '學習者發展與適性輔導', '國語文能力測驗'].sort(compareSubjects)).toEqual([
      '教育理念與實務',
      '課程教學與評量',
      '學習者發展與適性輔導',
      '國語文能力測驗',
    ]);
  });

  it('sorts wrong-question year options by newest numeric year first with all fixed first', () => {
    const questions = [
      createQuestion('q1', '114', '教育理念與實務', '測驗', '1', CHOICE_QUESTION_TYPE),
      createQuestion('q2', '115', '教育理念與實務', '測驗', '2', CHOICE_QUESTION_TYPE),
      createQuestion('q3', '114', '教育理念與實務', '測驗', '3', CHOICE_QUESTION_TYPE),
      createQuestion('q4', '', '教育理念與實務', '測驗', '4', CHOICE_QUESTION_TYPE),
      createQuestion('q5', 'unknown', '教育理念與實務', '測驗', '5', CHOICE_QUESTION_TYPE),
    ];

    const options = buildWrongQuestionFilterOptions(questions, {
      year: getAllFilterValue(),
      subject: getAllFilterValue(),
      learningTheme: getAllFilterValue(),
    });

    expect(options.years).toEqual([getAllFilterValue(), '115', '114']);
  });

  it('normalizes answer and question heading text', () => {
    expect(normalizeChoiceAnswer('Ｂ')).toBe('(B)');
    expect(normalizeChoiceAnswer('(c)')).toBe('(C)');
    expect(formatQuestionHeading(createQuestion('q1', '115年', '教育理念與實務', '評量', '12題', CHOICE_QUESTION_TYPE))).toBe(
      '【115年 教育理念與實務 第12題】',
    );
  });

  it('adds local export date to one-line title and keeps filename date format', () => {
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion('q1', '113', '教育理念與實務', '評量', '1', CHOICE_QUESTION_TYPE), wrongCount: 1 }],
      now: new Date('2026-07-12T00:00:00'),
    });

    expect(formatLocalExportDate(new Date('2026-07-12T00:00:00'))).toBe('2026/07/12');
    expect(model.title).toBe('Jimmy的錯題本 2026/07/12');
    expect(model.title).not.toContain('\n');
    expect(model.fileName).toBe('Jimmy_錯題本_2026-07-12.pdf');
  });

  it('numbers question section with the same order as analysis section', () => {
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [
        { question: createQuestion('q1', '113', '教育理念與實務', '評量', '8', CHOICE_QUESTION_TYPE, '第一題題幹'), wrongCount: 1 },
        { question: createQuestion('q2', '113', '教育理念與實務', '評量', '10', CHOICE_QUESTION_TYPE, '第二題題幹'), wrongCount: 1 },
      ],
      now: new Date('2026-07-12T00:00:00'),
    });

    expect(model.questionLines).toContain('1. 第一題題幹');
    expect(model.questionLines).toContain('2. 第二題題幹');
    expect(model.questionLines).toContain('【113年 教育理念與實務 第8題】');
    expect(model.analysisLines[0]).toContain('1.');
    expect(model.analysisLines[11]).toContain('2.');
    expect(model.questionLines.join('\n')).not.toContain('答案');
  });

  it('renumbers filtered results from one', () => {
    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      items: [{ question: createQuestion('q2', '113', '教育理念與實務', '評量', '10', CHOICE_QUESTION_TYPE, '第二題題幹'), wrongCount: 1 }],
      now: new Date('2026-07-12T00:00:00'),
    });

    expect(model.questionLines).toContain('1. 第二題題幹');
    expect(model.analysisLines[0]).toContain('1.');
  });

  it('validates generated PDF bytes before saving', () => {
    const validPdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');

    expect(() => validateGeneratedPdf(validPdf, 'application/pdf')).not.toThrow();
    expect(() => validateGeneratedPdf(new TextEncoder().encode('not a pdf'), 'application/pdf')).toThrow('Invalid PDF output.');
    expect(() => validateGeneratedPdf(validPdf, 'text/plain')).toThrow('Invalid PDF output.');
  });

  it('creates a valid canvas-based PDF blob', async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const context = {
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      direction: '',
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
    };
    vi.stubGlobal('document', {
      fonts: { ready: Promise.resolve() },
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => context),
        toBlob: vi.fn((callback: (blob: Blob) => void) => callback(new Blob([jpegBytes], { type: 'image/jpeg' }))),
      })),
    });

    const blob = await createWrongQuestionPdfBlob(['Jimmy的錯題本', '1. 題幹', '(A) 選項A']);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    const tail = new TextDecoder().decode(bytes.slice(Math.max(0, bytes.length - 32)));

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
    expect(header).toBe('%PDF-');
    expect(tail).toContain('%%EOF');
  });

  it('starts analysis on a new page with the centered analysis title instead of the old marker', async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const contexts: Array<{
      fillStyle: string;
      font: string;
      textAlign: string;
      textBaseline: string;
      direction: string;
      setTransform: ReturnType<typeof vi.fn>;
      fillRect: ReturnType<typeof vi.fn>;
      fillText: ReturnType<typeof vi.fn>;
      measureText: ReturnType<typeof vi.fn>;
    }> = [];

    vi.stubGlobal('document', {
      fonts: { ready: Promise.resolve() },
      createElement: vi.fn(() => {
        const context = {
          fillStyle: '',
          font: '',
          textAlign: '',
          textBaseline: '',
          direction: '',
          setTransform: vi.fn(),
          fillRect: vi.fn(),
          fillText: vi.fn(),
          measureText: vi.fn((text: string) => ({ width: text.length * 12 })),
        };
        contexts.push(context);

        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => context),
          toBlob: vi.fn((callback: (blob: Blob) => void) => callback(new Blob([jpegBytes], { type: 'image/jpeg' }))),
        };
      }),
    });

    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      now: new Date('2026-07-12T00:00:00'),
      items: [
        {
          question: {
            ...createQuestion('q1', '115', '教育理念與實務', '評量', '1', CHOICE_QUESTION_TYPE, '題幹'),
            correctAnswer: 'A',
            stemAnalysis: '解析內容',
            optionAAnalysis: 'A解析',
          },
          wrongCount: 1,
        },
      ],
    });

    await createWrongQuestionPdfBlobFromModel(model);

    expect(contexts).toHaveLength(2);
    const renderedText = contexts.flatMap((context) => context.fillText.mock.calls.map(([text]) => text));
    expect(renderedText).toContain('錯題本解析');
    expect(renderedText).toContain(' 2026/07/12');
    expect(renderedText).not.toContain(`解析${'：'}`);
    expect(renderedText.filter((text) => text === '錯題本解析')).toHaveLength(1);

    const analysisCalls = contexts[1].fillText.mock.calls;
    const answerX = Number(analysisCalls.find(([text]) => text === '1. ')?.[1]);
    const stemAnalysisX = Number(analysisCalls.find(([text]) => text === '題幹解析：解析內容')?.[1]);
    const optionAnalysisX = Number(analysisCalls.find(([text]) => text === '(A) A')?.[1]);

    expect(stemAnalysisX).toBeGreaterThan(answerX);
    expect(optionAnalysisX).toBeGreaterThan(answerX);
  });

  it('renders the final wrong-question PDF model with a separate analysis section and tracked positions', async () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const contexts: Array<{
      fillStyle: string;
      font: string;
      textAlign: string;
      textBaseline: string;
      direction: string;
      setTransform: ReturnType<typeof vi.fn>;
      fillRect: ReturnType<typeof vi.fn>;
      fillText: ReturnType<typeof vi.fn>;
      measureText: ReturnType<typeof vi.fn>;
    }> = [];

    vi.stubGlobal('document', {
      fonts: { ready: Promise.resolve() },
      createElement: vi.fn(() => {
        const context = {
          fillStyle: '',
          font: '',
          textAlign: '',
          textBaseline: '',
          direction: '',
          setTransform: vi.fn(),
          fillRect: vi.fn(),
          fillText: vi.fn(),
          measureText: vi.fn((text: string) => ({ width: text.length * 12 })),
        };
        contexts.push(context);

        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => context),
          toBlob: vi.fn((callback: (blob: Blob) => void) => callback(new Blob([jpegBytes], { type: 'image/jpeg' }))),
        };
      }),
    });

    const model = buildWrongQuestionPdfModel({
      displayName: 'Jimmy',
      now: new Date('2026-07-12T00:00:00'),
      items: Array.from({ length: 6 }, (_, index) => ({
        question: createQuestion(
          `q${index + 1}`,
          '115',
          '教育理念與實務',
          '評量',
          String(index + 1),
          CHOICE_QUESTION_TYPE,
          `第 ${index + 1} 題題幹`,
        ),
        wrongCount: 1,
      })),
    });

    await createWrongQuestionPdfBlobFromModel(model);
    const metadata = getLastWrongQuestionPdfDebugMetadata();

    expect(model.analysisLines).not.toContain(`解析${'：'}`);
    expect(metadata?.renderedAnalysisTitle).toBe('錯題本解析 2026/07/12');
    expect(metadata?.analysisStartPageIndex).toBeGreaterThan(metadata?.questionPages ?? 0);
    expect(metadata?.analysisBlocks).toBeGreaterThan(0);

    const answerPosition = metadata?.analysisBlockPositions.find((position) => position.kind === 'analysisAnswer');
    const stemPosition = metadata?.analysisBlockPositions.find((position) => position.kind === 'analysisContent');
    const optionPosition = metadata?.analysisBlockPositions.find((position) => position.kind === 'analysisOption');

    expect(stemPosition?.firstLineX).toBeGreaterThan(answerPosition?.firstLineX ?? 0);
    expect(optionPosition?.firstLineX).toBeGreaterThan(answerPosition?.firstLineX ?? 0);
    expect(optionPosition?.hangingLineX).toBeGreaterThan(optionPosition?.firstLineX ?? 0);

    const renderedText = contexts.flatMap((context) => context.fillText.mock.calls.map(([text]) => text));
    expect(renderedText).not.toContain(`解析${'：'}`);
    expect(renderedText).toContain('錯題本解析');
    expect(renderedText).toContain(' 2026/07/12');
  });
});

function createQuestion(
  id: string,
  year: string,
  subject: string,
  learningTheme: string,
  questionNumber: string,
  type: Question['type'],
  stem = '題幹',
): Question {
  return {
    id,
    year,
    category: '教檢',
    subject,
    questionNumber,
    type,
    score: 2,
    group: learningTheme,
    learningTheme,
    knowledgeNode: '核心',
    stem,
    optionA: '選項A',
    optionB: '選項B',
    optionC: '選項C',
    optionD: '選項D',
    correctAnswer: 'B',
  };
}

function createRecord(questionId: string, wrongCount: number, lastCorrect: boolean): LearningRecord {
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
  };
}
