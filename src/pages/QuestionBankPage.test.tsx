import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QUESTION_BANK_TEMPLATE_HEADERS } from '../services/questionBankFields';
import { buildQuestionBankTemplateCsv, createCsvRow, escapeCsvValue } from '../services/questionBankTemplateService';
import { parseCsv } from '../services/csvService';
import { validateQuestionBankCsv } from '../services/questionBankValidator';
import QuestionBankPage, {
  ActionMessageText,
  buildCsvTemplateBlob,
  CsvStatusPanel,
  exportCsvTemplate,
  ValidationReport,
} from './QuestionBankPage';
import type { QuestionBankValidationResult } from '../types/QuestionBankValidation';

describe('QuestionBankPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders validation report as collapsed summary without rendering full issue lists', () => {
    const validation = createValidation();
    const html = renderToStaticMarkup(<ValidationReport validation={validation} />);

    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
    expect(html).toContain('CSV');
    expect(html).not.toContain('question-bank-issues');
    expect(html).not.toContain('第 2 列');
    expect(html).not.toContain('errors');
    expect(html).not.toContain('warnings');
    expect(html).not.toContain('Validation Report');
  });

  it('CSV template can be re-imported', () => {
    const csv = buildQuestionBankTemplateCsv();
    const validation = validateQuestionBankCsv(csv);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('exports a useful CSV template with BOM, 35 headers, and five example rows', () => {
    const csv = buildQuestionBankTemplateCsv();
    const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r\n/);
    const rows = parseCsv(csv);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lines[0].split(',')).toEqual([...QUESTION_BANK_TEMPLATE_HEADERS]);
    expect(QUESTION_BANK_TEMPLATE_HEADERS).toHaveLength(35);
    expect(lines).toHaveLength(6);
    expect(rows).toHaveLength(5);
    expect(csv).toContain('TEMPLATE-C-001');
    expect(csv).toContain('TEMPLATE-C-002');
    expect(csv).toContain('TEMPLATE-C-003');
    expect(csv).toContain('TEMPLATE-E-001');
    expect(csv).toContain('TEMPLATE-E-002');
    expect(csv).toContain('範例資料，可刪除');
  });

  it('escapes commas, quotes, and line breaks in CSV values', () => {
    expect(escapeCsvValue('A,B')).toBe('"A,B"');
    expect(escapeCsvValue('A "quoted" value')).toBe('"A ""quoted"" value"');
    expect(createCsvRow(['A', 'B\nC'])).toBe('A,"B\nC"');
  });

  it('downloads the CSV template without opening showSaveFilePicker', async () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const showSaveFilePicker = vi.fn();
    const createElement = vi.fn(() => ({
      click,
      remove,
      set download(value: string) {
        expect(value).toBe('JLS_question_template.csv');
      },
      set href(value: string) {
        expect(value).toBe('blob:test');
      },
    }));
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('window', { showSaveFilePicker });
    vi.stubGlobal('document', {
      body: { appendChild },
      createElement,
    });
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    await exportCsvTemplate();

    expect(showSaveFilePicker).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    vi.useRealTimers();
  });

  it('builds the CSV template blob with the expected CSV MIME type and BOM content', async () => {
    const blob = buildCsvTemplateBlob();
    const text = await blob.text();

    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(text.startsWith('\uFEFF')).toBe(true);
    expect(text).toContain('TEMPLATE-C-001');
  });

  it('renders CSV action messages above validation details with accessible status roles', () => {
    const successHtml = renderToStaticMarkup(<ActionMessageText message={{ kind: 'success', text: 'CSV 範本已儲存。' }} />);
    const errorHtml = renderToStaticMarkup(<ActionMessageText message={{ kind: 'error', text: 'CSV 範本儲存失敗。' }} />);
    const panelHtml = renderToStaticMarkup(
      <CsvStatusPanel
        importMessage={{ kind: 'success', text: '匯入成功！' }}
        exportCsvMessage={{ kind: 'error', text: 'CSV 範本儲存失敗。' }}
        validation={createValidation()}
      />,
    );

    expect(QuestionBankPage.toString()).not.toContain('library-action-row');
    expect(QuestionBankPage.toString()).toContain('importMessage');
    expect(QuestionBankPage.toString()).toContain('exportCsvMessage');
    expect(panelHtml.indexOf('匯入成功！')).toBeLessThan(panelHtml.indexOf('<details'));
    expect(panelHtml.indexOf('CSV 範本儲存失敗。')).toBeLessThan(panelHtml.indexOf('<details'));
    expect(successHtml).toContain('role="status"');
    expect(successHtml).toContain('aria-live="polite"');
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain('aria-live="assertive"');
  });

  it('removes Coming Soon from more feature buttons', () => {
    expect(QuestionBankPage.toString()).toContain('openWrongQuestionModal');
    expect(QuestionBankPage.toString()).toContain('openBackupModal');
    expect(QuestionBankPage.toString()).toContain('restoreInputRef');
    expect(QuestionBankPage.toString()).not.toContain('Coming Soon');
  });
});

function createValidation(): QuestionBankValidationResult {
  return {
    isValid: false,
    errors: [{ level: 'error', field: '題幹', message: '題幹不可空白。', rowNumber: 2 }],
    warnings: [{ level: 'warning', field: '年度', message: '年度空白。', rowNumber: 2 }],
    summary: {
      choiceQuestionCount: 0,
      essayQuestionCount: 0,
      knowledgeNodeCount: 0,
      learningThemeCount: 0,
      subjectCount: 0,
      totalQuestions: 1,
      yearCount: 0,
    },
  };
}
