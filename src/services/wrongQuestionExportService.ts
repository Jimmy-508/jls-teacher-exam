import { CHOICE_QUESTION_TYPE } from './questionBankFields';
import { normalizeChoiceKey } from './questionEngine';
import { buildQuestionLogicalKey, type QuestionIdentitySnapshot } from './questionBankIdentityService';
import { saveBlobWithPicker, type SaveBlobResult } from './fileSaveService';
import { LEARNING_RECORDS_STORAGE_KEY } from './learningEngine';
import { JLS_LEARNING_RECORDS_STORAGE_KEY } from './storageKeys';
import { load } from './storageService';
import { buildExamYearOptions, compareExamYearsDescending } from './yearService';
import {
  compareLocalDateRange,
  formatLocalDateKey,
  isDateInInclusiveLocalRange,
} from './dateService';
import { compareTeacherExamSubjects, TEACHER_EXAM_SUBJECT_ORDER, sortTeacherExamSubjects } from '../constants/subjectOrder';
import type { LearningRecord } from '../types/LearningRecord';
import type { ChoiceKey, Question } from '../types/question';
import type {
  WrongQuestionExportItem,
  WrongQuestionFilters,
  WrongQuestionPdfModel,
} from '../types/WrongQuestionExport';

const ALL_FILTER_VALUE = '全部';
export const SUBJECT_ORDER = TEACHER_EXAM_SUBJECT_ORDER;
const PDF_WIDTH_PT = 595.28;
const PDF_HEIGHT_PT = 841.89;
const RENDER_SCALE = 2;
const CANVAS_WIDTH_PX = 1191;
const CANVAS_HEIGHT_PX = 1684;
const BODY_FONT_PT = 12;
const TITLE_FONT_PT = 14;
const TITLE_DATE_FONT_PT = 11;
const PDF_LAYOUT = {
  margin: {
    leftPt: 36,
    rightPt: 36,
    topPt: 36,
    bottomPt: 36,
  },
  question: {
    optionIndentPt: 14,
  },
  analysis: {
    answerIndentPt: 0,
    answerHangingIndentChars: 2,
    contentIndentPt: 14,
    optionIndentPt: 20,
    labelGapPt: 4,
  },
  spacing: {
    titleAfterPt: 16,
    analysisTitleAfterPt: 18,
    blankPt: 8,
    blockAfterPt: 2,
    sectionBeforePt: 8,
  },
} as const;

export interface WrongQuestionPdfDebugMetadata {
  questionPages: number;
  analysisStartPageIndex: number | null;
  renderedQuestionTitle: string;
  renderedAnalysisTitle: string;
  questionTitleDateFontPt: number;
  analysisTitleDateFontPt: number;
  analysisBlocks: number;
  analysisBlockPositions: Array<{
    kind: PdfBlockKind;
    pageIndex: number;
    firstLineX: number;
    hangingLineX: number;
  }>;
}

let lastWrongQuestionPdfDebugMetadata: WrongQuestionPdfDebugMetadata | null = null;

export interface WrongQuestionFilterOptions {
  years: string[];
  subjects: string[];
  learningThemes: string[];
}

export async function loadWrongQuestionRecords(): Promise<Record<string, LearningRecord>> {
  const currentRecords = await load<Record<string, LearningRecord>>(LEARNING_RECORDS_STORAGE_KEY);
  const legacyRecords = await load<LearningRecord[] | Record<string, LearningRecord>>(JLS_LEARNING_RECORDS_STORAGE_KEY);

  return {
    ...normalizeLearningRecords(legacyRecords),
    ...normalizeLearningRecords(currentRecords),
  };
}

export function buildWrongQuestionFilterOptions(
  questions: readonly Question[],
  filters: WrongQuestionFilters,
  recordsByQuestionId: Record<string, LearningRecord> = {},
  questionIdentities: Record<string, QuestionIdentitySnapshot> = {},
): WrongQuestionFilterOptions {
  const yearFiltered = questions.filter((question) => matchesFilter(question.year, filters.year));
  const subjectFiltered = yearFiltered.filter((question) => matchesFilter(question.subject, filters.subject));
  const hasWrongQuestionRecords = Object.keys(recordsByQuestionId).length > 0;
  const learningThemeSource = hasWrongQuestionRecords
    ? subjectFiltered.filter((question) => isWrongChoiceQuestionForRecord(question, recordsByQuestionId, questionIdentities))
    : subjectFiltered;

  return {
    years: buildYearOptions(questions.map((question) => question.year)),
    subjects: buildSubjectOptions(yearFiltered.map((question) => question.subject)),
    learningThemes: buildLearningThemeOptions(learningThemeSource.map(getQuestionLearningTheme)),
  };
}

export function filterWrongChoiceQuestions(
  questions: readonly Question[],
  recordsByQuestionId: Record<string, LearningRecord>,
  filters: WrongQuestionFilters,
  questionIdentities: Record<string, QuestionIdentitySnapshot> = {},
): WrongQuestionExportItem[] {
  return questions
    .filter((question) => question.type === CHOICE_QUESTION_TYPE)
    .filter((question) => matchesFilter(question.year, filters.year))
    .filter((question) => matchesFilter(question.subject, filters.subject))
    .filter((question) => matchesFilter(getQuestionLearningTheme(question), filters.learningTheme))
    .flatMap((question) => {
      if (!normalizeChoiceKey(question.correctAnswer)) {
        return [];
      }

      const record = recordsByQuestionId[question.id];
      const wrongCount = Number(record?.wrongCount ?? 0);

      return wrongCount > 0 &&
        hasAttemptInPracticeDateFilter(record, filters) &&
        isRecordSafeForQuestion(record, question, questionIdentities[question.id])
        ? [{ question, wrongCount }]
        : [];
    })
    .sort((left, right) => compareQuestions(left.question, right.question));
}

function isWrongChoiceQuestionForRecord(
  question: Question,
  recordsByQuestionId: Record<string, LearningRecord>,
  questionIdentities: Record<string, QuestionIdentitySnapshot>,
): boolean {
  if (question.type !== CHOICE_QUESTION_TYPE) {
    return false;
  }

  if (!normalizeChoiceKey(question.correctAnswer)) {
    return false;
  }

  const record = recordsByQuestionId[question.id];
  const wrongCount = Number(record?.wrongCount ?? 0);

  return wrongCount > 0 && isRecordSafeForQuestion(record, question, questionIdentities[question.id]);
}

function isRecordSafeForQuestion(
  record: LearningRecord | undefined,
  question: Question,
  currentIdentity?: QuestionIdentitySnapshot,
): boolean {
  if (!record || record.questionId !== question.id) {
    return false;
  }

  if (!record.questionIdentity) {
    return true;
  }

  if (record.questionIdentity.logicalKey !== buildQuestionLogicalKey(question)) {
    return false;
  }

  return currentIdentity ? record.questionIdentity.contentHash === currentIdentity.contentHash : true;
}

export function hasAttemptInPracticeDateFilter(
  record: LearningRecord | undefined,
  filters: Pick<WrongQuestionFilters, 'startDate' | 'endDate'>,
): boolean {
  const attempts = record?.attempts ?? [];
  const startDate = filters.startDate;
  const endDate = filters.endDate;

  if (!startDate || !endDate || compareLocalDateRange(startDate, endDate) > 0) {
    return false;
  }

  return attempts.some((attempt) => isDateInInclusiveLocalRange(attempt.attemptedAt, startDate, endDate));
}

export function getWrongQuestionDateFilterError(filters: WrongQuestionFilters): string {
  if (!filters.startDate || !filters.endDate) {
    return '請完整選擇起日與迄日。';
  }

  if (compareLocalDateRange(filters.startDate, filters.endDate) > 0) {
    return '起日不可晚於迄日。';
  }

  return '';
}

export function sortWrongQuestionExportItems(items: readonly WrongQuestionExportItem[]): WrongQuestionExportItem[] {
  return [...items].sort((left, right) => compareQuestions(left.question, right.question));
}

export function buildWrongQuestionPdfModel(params: {
  displayName: string;
  items: readonly WrongQuestionExportItem[];
  filters?: WrongQuestionFilters;
  now?: Date;
}): WrongQuestionPdfModel {
  const now = params.now ?? new Date();
  const displayName = params.displayName.trim() || 'Jimmy';
  const sortedItems = sortWrongQuestionExportItems(params.items);
  const dateInfo = buildWrongQuestionExportDateInfo(params.filters, now);
  const titleText = `${displayName}的錯題本`;
  const analysisTitleText = '錯題本解析';
  const title = `${titleText} ${dateInfo.displayDateLabel}`;
  const fileName = `${sanitizeFileName(displayName)}_錯題本_${dateInfo.fileDateLabel}.pdf`;
  const questionLines = buildQuestionLines(sortedItems);
  const analysisLines = buildAnalysisLines(sortedItems);

  return {
    title,
    titleText,
    analysisTitleText,
    fileName,
    generatedAt: now.toISOString(),
    formattedExportDate: dateInfo.displayDateLabel,
    fileDateLabel: dateInfo.fileDateLabel,
    items: sortedItems,
    questionLines,
    analysisLines,
  };
}

export async function exportWrongQuestionPdf(model: WrongQuestionPdfModel): Promise<SaveBlobResult> {
  let blob: Blob;

  try {
    blob = await createWrongQuestionPdfBlobFromModel(model);
  } catch (error) {
    logPdfExportError(error);
    throw new Error('錯題本產生失敗，請重新嘗試。');
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
    throw new Error('錯題本儲存失敗，請確認儲存位置後再試一次。');
  }
}

export function normalizeChoiceAnswer(answer: string): string {
  const normalized = answer
    .trim()
    .replace(/[()（）]/g, '')
    .replace(/[Ａ-Ｄ]/g, (value) => String.fromCharCode(value.charCodeAt(0) - 0xfee0))
    .toUpperCase();

  return ['A', 'B', 'C', 'D'].includes(normalized) ? `(${normalized})` : '(未提供)';
}

export function formatQuestionHeading(question: Question): string {
  const year = formatYear(question.year);
  const subject = question.subject || '未分類科目';
  const questionNumber = formatQuestionNumber(question.questionNumber);

  return `【${year} ${subject} ${questionNumber}】`;
}

export function getAllFilterValue(): string {
  return ALL_FILTER_VALUE;
}

function buildQuestionLines(items: readonly WrongQuestionExportItem[]): string[] {
  return items.flatMap(({ question }, index) => [
    formatQuestionHeading(question),
    `${index + 1}. ${question.stem}`,
    `(A) ${question.optionA ?? ''}`,
    `(B) ${question.optionB ?? ''}`,
    `(C) ${question.optionC ?? ''}`,
    `(D) ${question.optionD ?? ''}`,
    '',
  ]);
}

function buildAnalysisLines(items: readonly WrongQuestionExportItem[]): string[] {
  return items.flatMap(({ question }, index) => [
    `${index + 1}. 答案：${normalizeChoiceAnswer(question.correctAnswer)}`,
    `題幹解析：${fallbackText(question.stemAnalysis)}`,
    '',
    `(A) ${fallbackText(question.optionAAnalysis)}`,
    `(B) ${fallbackText(question.optionBAnalysis)}`,
    `(C) ${fallbackText(question.optionCAnalysis)}`,
    `(D) ${fallbackText(question.optionDAnalysis)}`,
    '',
    `解題技巧：${fallbackText(question.solvingTechnique ?? question.solvingTip)}`,
    `易混淆概念：${fallbackText(question.confusingConcepts ?? question.commonMistake)}`,
    '',
  ]);
}

function buildWrongQuestionExportDateInfo(
  filters: WrongQuestionFilters | undefined,
  now: Date,
): { displayDateLabel: string; fileDateLabel: string } {
  const today = formatLocalDateKey(now);
  const startDate = filters?.startDate ?? today;
  const endDate = filters?.endDate ?? today;
  const safeStartDate = startDate || today;
  const safeEndDate = endDate || safeStartDate;
  const isSingleDay = safeStartDate === safeEndDate;
  const displayDateLabel = formatWrongQuestionPdfDateRange(safeStartDate, safeEndDate);
  const fileDateLabel = isSingleDay ? safeStartDate : `${safeStartDate}_至_${safeEndDate}`;

  return {
    displayDateLabel,
    fileDateLabel,
  };
}

export function formatWrongQuestionPdfDateRange(startDate: string, endDate: string): string {
  const start = parseDateParts(startDate) ?? parseDateParts(formatLocalDateKey())!;
  const end = parseDateParts(endDate) ?? start;

  if (toDateKeyFromParts(start) === toDateKeyFromParts(end)) {
    return `${start.month}/${start.day}`;
  }

  if (start.year === end.year) {
    return `${start.month}/${start.day}~${end.month}/${end.day}`;
  }

  return `${start.year}/${start.month}/${start.day}~${end.year}/${end.month}/${end.day}`;
}

function parseDateParts(value: string): { year: string; month: string; day: string } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? { year: match[1], month: match[2], day: match[3] } : null;
}

function toDateKeyFromParts(parts: { year: string; month: string; day: string }): string {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export async function createWrongQuestionPdfBlob(lines: readonly string[]): Promise<Blob> {
  const images = await renderPdfDocumentToJpegPages(buildLegacyPdfDocument(lines));
  const bytes = assembleImagePdfBytes(images);
  validateGeneratedPdf(bytes, 'application/pdf');
  return new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' });
}

export async function createWrongQuestionPdfBlobFromModel(model: WrongQuestionPdfModel): Promise<Blob> {
  const images = await renderPdfDocumentToJpegPages(buildWrongQuestionPdfDocument(model));
  const bytes = assembleImagePdfBytes(images);
  validateGeneratedPdf(bytes, 'application/pdf');
  return new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' });
}

export function getLastWrongQuestionPdfDebugMetadata(): WrongQuestionPdfDebugMetadata | null {
  return lastWrongQuestionPdfDebugMetadata;
}

export function validateGeneratedPdf(bytes: Uint8Array, mimeType: string): void {
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  const tail = new TextDecoder().decode(bytes.slice(Math.max(0, bytes.length - 32)));

  if (mimeType !== 'application/pdf' || bytes.length === 0 || header !== '%PDF-' || !tail.includes('%%EOF')) {
    throw new Error('Invalid PDF output.');
  }
}

interface PdfObject {
  id: number;
  parts: Uint8Array[];
}

interface TextRun {
  text: string;
  script: 'chinese' | 'latin';
}

interface WrappedLine {
  runs: TextRun[];
  x: number;
}

type PdfBlockKind =
  | 'questionHeading'
  | 'questionStem'
  | 'questionOption'
  | 'analysisAnswer'
  | 'analysisContent'
  | 'analysisOption'
  | 'spacer';

interface PdfSection {
  kind: 'questions' | 'analysis';
  forceNewPage: boolean;
  title: PdfSectionTitle;
  blocks: PdfTextBlock[];
}

interface PdfSectionTitle {
  text: string;
  dateLabel?: string;
}

interface WrongQuestionPdfDocument {
  questionSection: PdfSection;
  analysisSection: PdfSection;
}

interface PdfTextBlock {
  kind: PdfBlockKind;
  text: string;
}

interface PdfBlockLayout {
  firstLineX: number;
  hangingLineX: number;
  spacingBefore: number;
  spacingAfter: number;
  centered?: boolean;
}

interface WrapMixedTextOptions {
  text: string;
  maxWidth: number;
  firstLineX: number;
  hangingLineX: number;
  measureRun: (run: TextRun) => number;
}

export function splitTextByScript(text: string): TextRun[] {
  const cleanText = cleanPdfText(text);
  const runs: TextRun[] = [];

  for (const char of Array.from(cleanText)) {
    const script: TextRun['script'] = /[\u0000-\u007f]/.test(char) ? 'latin' : 'chinese';
    const lastRun = runs[runs.length - 1];

    if (lastRun?.script === script) {
      lastRun.text += char;
      continue;
    }

    runs.push({ text: char, script });
  }

  return runs;
}

export function wrapMixedText({
  text,
  maxWidth,
  firstLineX,
  hangingLineX,
  measureRun,
}: WrapMixedTextOptions): WrappedLine[] {
  const tokens = tokenizeTextRuns(splitTextByScript(text));
  const lines: WrappedLine[] = [];
  let currentRuns: TextRun[] = [];
  let currentWidth = 0;
  let lineX = firstLineX;
  let availableWidth = maxWidth - firstLineX;

  tokens.forEach((token) => {
    const tokenWidth = measureRun(token);

    if (currentRuns.length > 0 && currentWidth + tokenWidth > availableWidth) {
      lines.push({ runs: trimLineRuns(currentRuns), x: lineX });
      currentRuns = [];
      currentWidth = 0;
      lineX = hangingLineX;
      availableWidth = maxWidth - hangingLineX;
    }

    if (tokenWidth > availableWidth && token.text.length > 1) {
      for (const char of Array.from(token.text)) {
        const charRun = { text: char, script: token.script };
        const charWidth = measureRun(charRun);

        if (currentRuns.length > 0 && currentWidth + charWidth > availableWidth) {
          lines.push({ runs: trimLineRuns(currentRuns), x: lineX });
          currentRuns = [];
          currentWidth = 0;
          lineX = hangingLineX;
          availableWidth = maxWidth - hangingLineX;
        }

        currentRuns = appendRun(currentRuns, charRun);
        currentWidth += charWidth;
      }

      return;
    }

    currentRuns = appendRun(currentRuns, token);
    currentWidth += tokenWidth;
  });

  lines.push({ runs: trimLineRuns(currentRuns.length > 0 ? currentRuns : [{ text: ' ', script: 'latin' }]), x: lineX });
  return lines;
}

async function renderPdfDocumentToJpegPages(documentModel: WrongQuestionPdfDocument): Promise<Uint8Array[]> {
  if ('fonts' in document) {
    await document.fonts.ready.catch(() => undefined);
  }

  const scale = RENDER_SCALE;
  const pageWidth = CANVAS_WIDTH_PX;
  const pageHeight = CANVAS_HEIGHT_PX;
  const marginLeft = ptToPx(PDF_LAYOUT.margin.leftPt);
  const marginRight = ptToPx(PDF_LAYOUT.margin.rightPt);
  const marginTop = ptToPx(PDF_LAYOUT.margin.topPt);
  const marginBottom = ptToPx(PDF_LAYOUT.margin.bottomPt);
  const lineHeight = ptToPx(18);
  const pageBottom = pageHeight - marginBottom;
  const rightEdge = pageWidth - marginRight;
  const pages: Uint8Array[] = [];
  let canvas = createCanvas(pageWidth, pageHeight);
  let context = getCanvasContext(canvas);
  let y = marginTop;
  let hasContent = false;
  let pageIndex = 1;
  let analysisStartPageIndex: number | null = null;
  const analysisBlockPositions: WrongQuestionPdfDebugMetadata['analysisBlockPositions'] = [];

  prepareCanvasPage(context, pageWidth, pageHeight, scale);

  const finishCurrentPage = async () => {
    if (hasContent) {
      pages.push(await canvasToJpegBytes(canvas));
      pageIndex += 1;
      canvas = createCanvas(pageWidth, pageHeight);
      context = getCanvasContext(canvas);
      prepareCanvasPage(context, pageWidth, pageHeight, scale);
      y = marginTop;
      hasContent = false;
    }
  };

  const startFreshPage = async () => {
    await finishCurrentPage();
  };

  const renderSectionTitle = async (title: PdfSectionTitle, spacingAfter: number) => {
    const blockHeight = lineHeight + spacingAfter;

    if (y + blockHeight > pageBottom && hasContent) {
      await finishCurrentPage();
    }

    drawMixedSizeCenteredTitle(context, title, pageWidth / 2, y, scale);
    y += lineHeight + spacingAfter;
    hasContent = true;
  };

  const renderBlocks = async (section: PdfSection) => {
    for (let blockIndex = 0; blockIndex < section.blocks.length; blockIndex += 1) {
      const block = section.blocks[blockIndex];

      if (block.kind === 'spacer') {
        y += ptToPx(PDF_LAYOUT.spacing.blankPt);
        continue;
      }

      const layout = getPdfBlockLayout(block, context, marginLeft);
      const wrappedLines = wrapPdfBlock(block, context, layout, rightEdge);
      const keepWithNextHeight = block.kind === 'analysisAnswer'
        ? getNextTextBlockPreviewHeight(section.blocks, blockIndex, context, marginLeft, rightEdge, lineHeight)
        : 0;
      const blockHeight = layout.spacingBefore + wrappedLines.length * lineHeight + layout.spacingAfter + keepWithNextHeight;

      if (y + blockHeight > pageBottom && hasContent) {
        await finishCurrentPage();
      }

      y += layout.spacingBefore;

      if (section.kind === 'analysis') {
        analysisBlockPositions.push({
          kind: block.kind,
          pageIndex,
          firstLineX: layout.firstLineX,
          hangingLineX: layout.hangingLineX,
        });
      }

      wrappedLines.forEach((wrappedLine) => {
        drawRuns(context, wrappedLine.runs, wrappedLine.x, y);
        y += lineHeight;
      });
      y += layout.spacingAfter;
      hasContent = true;
    }
  };

  await renderSectionTitle(documentModel.questionSection.title, ptToPx(PDF_LAYOUT.spacing.titleAfterPt));
  await renderBlocks(documentModel.questionSection);
  const questionPages = pageIndex;

  if (documentModel.analysisSection.blocks.length > 0) {
    await startFreshPage();
    analysisStartPageIndex = pageIndex;
    await renderSectionTitle(documentModel.analysisSection.title, ptToPx(PDF_LAYOUT.spacing.analysisTitleAfterPt));
    await renderBlocks(documentModel.analysisSection);
  }

  pages.push(await canvasToJpegBytes(canvas));
  lastWrongQuestionPdfDebugMetadata = {
    questionPages,
    analysisStartPageIndex,
    renderedQuestionTitle: formatSectionTitle(documentModel.questionSection.title),
    renderedAnalysisTitle: formatSectionTitle(documentModel.analysisSection.title),
    questionTitleDateFontPt: TITLE_DATE_FONT_PT,
    analysisTitleDateFontPt: TITLE_DATE_FONT_PT,
    analysisBlocks: documentModel.analysisSection.blocks.filter((block) => block.kind !== 'spacer').length,
    analysisBlockPositions,
  };

  if (import.meta.env.DEV) {
    console.info('[JLS PDF]', {
      questionPages,
      analysisStartPage: analysisStartPageIndex,
      analysisTitle: formatSectionTitle(documentModel.analysisSection.title),
      analysisBlocks: lastWrongQuestionPdfDebugMetadata.analysisBlocks,
    });
  }

  return pages;
}

function buildLegacyPdfDocument(lines: readonly string[]): WrongQuestionPdfDocument {
  const [rawTitle = '錯題本', ...contentLines] = lines;
  const title = cleanPdfText(rawTitle);

  return {
    questionSection: {
      kind: 'questions',
      forceNewPage: false,
      title: { text: title },
      blocks: buildQuestionBlocks(contentLines),
    },
    analysisSection: {
      kind: 'analysis',
      forceNewPage: true,
      title: { text: '' },
      blocks: [],
    },
  };
}

function buildWrongQuestionPdfDocument(model: WrongQuestionPdfModel): WrongQuestionPdfDocument {
  return {
    questionSection: {
      kind: 'questions',
      forceNewPage: false,
      title: {
        text: model.titleText,
        dateLabel: model.formattedExportDate,
      },
      blocks: buildQuestionBlocks(model.questionLines),
    },
    analysisSection: {
      kind: 'analysis',
      forceNewPage: true,
      title: {
        text: model.analysisTitleText,
        dateLabel: model.formattedExportDate,
      },
      blocks: buildAnalysisBlocks(model.analysisLines),
    },
  };
}

function buildQuestionBlocks(lines: readonly string[]): PdfTextBlock[] {
  return lines.map((rawLine) => {
    const line = cleanPdfText(rawLine);

    if (line.trim() === '') {
      return { kind: 'spacer', text: '' };
    }

    return {
      kind: classifyQuestionLine(line),
      text: line,
    };
  });
}

function buildAnalysisBlocks(lines: readonly string[]): PdfTextBlock[] {
  return lines.map((rawLine) => {
    const line = cleanPdfText(rawLine);

    if (line.trim() === '') {
      return { kind: 'spacer', text: '' };
    }

    return {
      kind: classifyAnalysisLine(line),
      text: line,
    };
  });
}

function classifyQuestionLine(line: string): PdfBlockKind {
  if (/^【.+】$/.test(line)) {
    return 'questionHeading';
  }

  if (/^\d+\.\s+/.test(line)) {
    return 'questionStem';
  }

  if (/^\([A-D]\)\s+/.test(line)) {
    return 'questionOption';
  }

  return 'questionStem';
}

function classifyAnalysisLine(line: string): PdfBlockKind {
  if (/^\d+\.\s*答案：/.test(line)) {
    return 'analysisAnswer';
  }

  if (/^\([A-D]\)\s+/.test(line)) {
    return 'analysisOption';
  }

  return 'analysisContent';
}

function getPdfBlockLayout(
  block: PdfTextBlock,
  context: CanvasRenderingContext2D,
  leftMargin: number,
): PdfBlockLayout {
  const firstLineX = leftMargin + getBlockIndentPx(block.kind);

  return {
    firstLineX,
    hangingLineX: getBlockHangingLineX(block.text, block.kind, context, firstLineX),
    spacingBefore: block.kind === 'analysisAnswer' ? ptToPx(PDF_LAYOUT.spacing.sectionBeforePt) : 0,
    spacingAfter: ptToPx(PDF_LAYOUT.spacing.blockAfterPt),
  };
}

function wrapPdfBlock(
  block: PdfTextBlock,
  context: CanvasRenderingContext2D,
  layout: PdfBlockLayout,
  rightEdge: number,
): WrappedLine[] {
  return wrapMixedText({
    text: block.text,
    maxWidth: rightEdge,
    firstLineX: layout.firstLineX,
    hangingLineX: layout.hangingLineX,
    measureRun: (run) => measureTextRun(context, run),
  });
}

function getNextTextBlockPreviewHeight(
  blocks: readonly PdfTextBlock[],
  currentIndex: number,
  context: CanvasRenderingContext2D,
  marginLeft: number,
  rightEdge: number,
  lineHeight: number,
): number {
  const nextBlock = blocks.slice(currentIndex + 1).find((block) => block.kind !== 'spacer');

  if (!nextBlock) {
    return 0;
  }

  const layout = getPdfBlockLayout(nextBlock, context, marginLeft);
  const wrappedLines = layout.centered
    ? [{ runs: splitTextByScript(nextBlock.text), x: marginLeft }]
    : wrapPdfBlock(nextBlock, context, layout, rightEdge);

  return layout.spacingBefore + Math.min(2, wrappedLines.length) * lineHeight + layout.spacingAfter;
}

function getBlockIndentPx(kind: PdfBlockKind): number {
  if (kind === 'questionOption') {
    return ptToPx(PDF_LAYOUT.question.optionIndentPt);
  }

  if (kind === 'analysisAnswer') {
    return ptToPx(PDF_LAYOUT.analysis.answerIndentPt);
  }

  if (kind === 'analysisOption') {
    return ptToPx(PDF_LAYOUT.analysis.optionIndentPt);
  }

  if (kind === 'analysisContent') {
    return ptToPx(PDF_LAYOUT.analysis.contentIndentPt);
  }

  return 0;
}

function getBlockHangingLineX(
  text: string,
  kind: PdfBlockKind,
  context: CanvasRenderingContext2D,
  firstLineX: number,
): number {
  if (kind === 'questionOption') {
    return firstLineX + measureMatchedPrefix(context, text, /^(\([A-D]\)\s+)/);
  }

  if (kind === 'analysisOption') {
    return firstLineX + measureMatchedPrefix(context, text, /^(\([A-D]\))/) + ptToPx(PDF_LAYOUT.analysis.labelGapPt);
  }

  if (kind === 'analysisAnswer') {
    return firstLineX + measurePlainText(context, '國'.repeat(PDF_LAYOUT.analysis.answerHangingIndentChars));
  }

  if (kind === 'questionStem') {
    return firstLineX + measureMatchedPrefix(context, text, /^(\d+\.\s+)/);
  }

  if (kind === 'analysisContent') {
    return firstLineX + measureMatchedPrefix(context, text, /^(.+?：)/);
  }

  return firstLineX;
}

function measureMatchedPrefix(context: CanvasRenderingContext2D, text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  return match ? measurePlainText(context, match[1]) : 0;
}

function ptToPx(value: number): number {
  return Math.round(value * RENDER_SCALE);
}

function prepareCanvasPage(context: CanvasRenderingContext2D, width: number, height: number, scale: number): void {
  context.resetTransform?.();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.direction = 'ltr';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#111827';
  setCanvasFont(context, 'chinese', BODY_FONT_PT * scale);
}

function drawMixedSizeCenteredTitle(
  context: CanvasRenderingContext2D,
  title: PdfSectionTitle,
  centerX: number,
  y: number,
  scale: number,
): void {
  const mainRuns = splitTextByScript(title.text);
  const dateRuns = title.dateLabel ? splitTextByScript(title.dateLabel) : [];
  const mainFontSizePx = TITLE_FONT_PT * scale;
  const dateFontSizePx = TITLE_DATE_FONT_PT * scale;
  const gapWidth = dateRuns.length > 0 ? measureTextRun(context, { text: ' ', script: 'latin' }, mainFontSizePx) : 0;
  const mainWidth = mainRuns.reduce((sum, run) => sum + measureTextRun(context, run, mainFontSizePx), 0);
  const dateWidth = dateRuns.reduce((sum, run) => sum + measureTextRun(context, run, dateFontSizePx), 0);
  const totalWidth = mainWidth + gapWidth + dateWidth;
  const startX = Math.round(centerX - totalWidth / 2);

  drawRuns(context, mainRuns, startX, Math.round(y), mainFontSizePx);

  if (dateRuns.length > 0) {
    drawRuns(context, dateRuns, startX + mainWidth + gapWidth, Math.round(y + (mainFontSizePx - dateFontSizePx) / 2), dateFontSizePx);
  }
}

function formatSectionTitle(title: PdfSectionTitle): string {
  return title.dateLabel ? `${title.text} ${title.dateLabel}` : title.text;
}

function drawRuns(
  context: CanvasRenderingContext2D,
  runs: readonly TextRun[],
  x: number,
  y: number,
  fontSizePx = BODY_FONT_PT * RENDER_SCALE,
): void {
  let currentX = Math.round(x);
  const alignedY = Math.round(y);

  runs.forEach((run) => {
    setCanvasFont(context, run.script, fontSizePx);
    context.fillText(run.text, Math.round(currentX), alignedY);
    currentX += context.measureText(run.text).width;
  });
}

function setCanvasFont(context: CanvasRenderingContext2D, script: TextRun['script'], fontSizePx: number, weight: 'normal' | 'bold' = 'normal'): void {
  const fontFamily = script === 'latin' ? '"Times New Roman", Times, serif' : '"DFKai-SB", "BiauKai", "標楷體", KaiTi, serif';
  context.font = `normal ${weight} ${fontSizePx}px ${fontFamily}`;
}

function measureTextRun(context: CanvasRenderingContext2D, run: TextRun, fontSize?: number): number {
  const currentFont = context.font;
  const size = fontSize ?? BODY_FONT_PT * RENDER_SCALE;
  setCanvasFont(context, run.script, size);
  const width = context.measureText(run.text).width;
  context.font = currentFont;
  return width;
}

function measurePlainText(context: CanvasRenderingContext2D, text: string): number {
  return splitTextByScript(text).reduce((sum, run) => sum + measureTextRun(context, run), 0);
}

function tokenizeTextRuns(runs: readonly TextRun[]): TextRun[] {
  return runs.flatMap((run) => {
    if (run.script === 'chinese') {
      return Array.from(run.text).map((char) => ({ text: char, script: run.script }));
    }

    return run.text
      .split(/(\s+|[()[\]{}.,;:!?/\\|+-]+)/)
      .filter((token) => token.length > 0)
      .map((token) => ({ text: token, script: run.script }));
  });
}

function appendRun(runs: TextRun[], token: TextRun): TextRun[] {
  const lastRun = runs[runs.length - 1];

  if (lastRun?.script === token.script) {
    return [...runs.slice(0, -1), { ...lastRun, text: `${lastRun.text}${token.text}` }];
  }

  return [...runs, token];
}

function trimLineRuns(runs: readonly TextRun[]): TextRun[] {
  const clonedRuns = runs.map((run) => ({ ...run }));

  while (clonedRuns[0]?.text.trim().length === 0 && clonedRuns.length > 1) {
    clonedRuns.shift();
  }

  if (clonedRuns[0]) {
    clonedRuns[0].text = clonedRuns[0].text.replace(/^\s+/, '');
  }

  if (clonedRuns[clonedRuns.length - 1]) {
    clonedRuns[clonedRuns.length - 1].text = clonedRuns[clonedRuns.length - 1].text.replace(/\s+$/, '');
  }

  return clonedRuns.filter((run) => run.text.length > 0);
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('無法建立 PDF 畫布。');
  }

  return context;
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) {
          resolve(value);
          return;
        }

        reject(new Error('無法產生 PDF 圖像。'));
      },
      'image/jpeg',
      0.9,
    );
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  canvas.width = 1;
  canvas.height = 1;
  return bytes;
}

function assembleImagePdfBytes(images: readonly Uint8Array[]): Uint8Array {
  const encoder = new TextEncoder();
  const pageObjectIds = images.map((_, index) => 3 + index * 3);
  const objects: PdfObject[] = [
    { id: 1, parts: [encoder.encode('<< /Type /Catalog /Pages 2 0 R >>')] },
    {
      id: 2,
      parts: [
        encoder.encode(
          `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`,
        ),
      ],
    },
  ];

  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const imageName = `Im${index + 1}`;
    const pageWidth = PDF_WIDTH_PT;
    const pageHeight = PDF_HEIGHT_PT;
    const stream = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /${imageName} Do Q`;
    const streamBytes = encoder.encode(stream);

    objects.push({
      id: pageId,
      parts: [
        encoder.encode(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
        ),
      ],
    });
    objects.push({
      id: contentId,
      parts: [encoder.encode(`<< /Length ${streamBytes.length} >>\nstream\n`), streamBytes, encoder.encode('\nendstream')],
    });
    objects.push({
      id: imageId,
      parts: [
        encoder.encode(
          `<< /Type /XObject /Subtype /Image /Width ${CANVAS_WIDTH_PX} /Height ${CANVAS_HEIGHT_PX} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
        ),
        image,
        encoder.encode('\nendstream'),
      ],
    });
  });

  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n%\u00ff\u00ff\u00ff\u00ff\n')];
  const offsets: number[] = [0];
  let byteLength = parts[0].length;

  objects.forEach((object) => {
    offsets[object.id] = byteLength;
    pushPdfPart(parts, encoder.encode(`${object.id} 0 obj\n`));
    object.parts.forEach((part) => pushPdfPart(parts, part));
    pushPdfPart(parts, encoder.encode('\nendobj\n'));
    byteLength = getPdfByteLength(parts);
  });

  const xrefOffset = byteLength;
  const objectCount = Math.max(...objects.map((object) => object.id));
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \r\n`;

  for (let objectId = 1; objectId <= objectCount; objectId += 1) {
    const offset = offsets[objectId] ?? 0;
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  xref += `trailer << /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  pushPdfPart(parts, encoder.encode(xref));

  return concatPdfParts(parts);
}

function pushPdfPart(parts: Uint8Array[], part: Uint8Array): void {
  parts.push(part);
}

function getPdfByteLength(parts: readonly Uint8Array[]): number {
  return parts.reduce((total, part) => total + part.length, 0);
}

function concatPdfParts(parts: readonly Uint8Array[]): Uint8Array {
  const totalLength = getPdfByteLength(parts);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function normalizeLearningRecords(
  value: LearningRecord[] | Record<string, LearningRecord> | null | undefined,
): Record<string, LearningRecord> {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return Object.fromEntries(value.filter((record) => record.questionId).map((record) => [record.questionId, record]));
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, record]) => Boolean(record?.questionId))
      .map(([key, record]) => [record.questionId || key, record]),
  );
}

function buildLearningThemeOptions(values: readonly string[]): string[] {
  const uniqueValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  const englishValues = uniqueValues.filter(isEnglishLearningTheme).sort(compareEnglishText);
  const nonEnglishValues = uniqueValues.filter((value) => !isEnglishLearningTheme(value)).sort(compareStrokeText);

  return [ALL_FILTER_VALUE, ...englishValues, ...nonEnglishValues];
}

function buildYearOptions(values: readonly string[]): string[] {
  return [ALL_FILTER_VALUE, ...buildExamYearOptions(values)];
}

function buildSubjectOptions(values: readonly string[]): string[] {
  return [ALL_FILTER_VALUE, ...sortTeacherExamSubjects(values)];
}

export function compareSubjects(left: string, right: string): number {
  return compareTeacherExamSubjects(left, right);
}

function matchesFilter(value: string, filter: string): boolean {
  return filter === ALL_FILTER_VALUE || value === filter;
}

function compareQuestions(left: Question, right: Question): number {
  return (
    compareExamYearsDescending(left.year, right.year) ||
    compareTeacherExamSubjects(left.subject, right.subject) ||
    compareQuestionNumber(left.questionNumber, right.questionNumber)
  );
}

function compareNaturalText(left: string, right: string): number {
  return left.localeCompare(right, 'zh-Hant', { numeric: true, sensitivity: 'base' });
}

function compareQuestionNumber(left: string, right: string): number {
  const leftNumber = parseQuestionNumber(left);
  const rightNumber = parseQuestionNumber(right);

  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  if (leftNumber !== null && rightNumber === null) {
    return -1;
  }

  if (leftNumber === null && rightNumber !== null) {
    return 1;
  }

  return compareNaturalText(left, right);
}

function parseQuestionNumber(value: string): number | null {
  const match = value.trim().match(/\d+/);
  const parsed = match ? Number(match[0]) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

const englishCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const strokeCollator = new Intl.Collator('zh-Hant-TW-u-co-stroke', { numeric: true, sensitivity: 'base' });

function compareEnglishText(left: string, right: string): number {
  return englishCollator.compare(left, right);
}

function compareStrokeText(left: string, right: string): number {
  return strokeCollator.compare(left, right);
}

function isEnglishLearningTheme(value: string): boolean {
  return /^[A-Za-z]/.test(value.trim());
}

function getQuestionLearningTheme(question: Question): string {
  return (question.learningTheme || question.group).trim();
}

function formatYear(value: string): string {
  const normalized = value.trim() || 'unknown';
  return normalized.endsWith('年') ? normalized : `${normalized}年`;
}

function formatQuestionNumber(value: string): string {
  const normalized = value.trim() || 'unknown';
  return normalized.startsWith('第') && normalized.endsWith('題')
    ? normalized
    : `第${normalized.replace(/^第/, '').replace(/題$/, '')}題`;
}

function fallbackText(value: string | undefined): string {
  return value?.trim() || '未提供';
}

function cleanPdfText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .trimEnd();
}

function sanitizeFileName(value: string): string {
  return (value.trim() || 'Jimmy').replace(/[\\/:*?"<>|]/g, '_');
}

export function formatLocalExportDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function logPdfExportError(error: unknown): void {
  if (import.meta.env.DEV) {
    console.error('[JLS PDF export]', error);
  }
}
