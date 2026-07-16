import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../components/Modal';
import { readQuestionBankCsvFile } from '../services/csvService';
import {
  createJlsBackup,
  createRestorePreview,
  downloadJlsBackup,
  parseAndValidateBackup,
  restoreJlsBackup,
} from '../services/backupRestoreService';
import {
  getActiveQuestionBank,
  getActiveQuestionBankMetadata,
  getActiveQuestions,
  resetImportedQuestionBank,
  saveParsedImportedQuestionBank,
} from '../services/questionBankStorageService';
import { buildQuestionBankTemplateCsv } from '../services/questionBankTemplateService';
import { buildQuestionIdentitySnapshots, type QuestionIdentitySnapshot } from '../services/questionBankIdentityService';
import { reconcileLearningRecordsForQuestionBank, saveIsolatedLearningRecords } from '../services/learningRecordReconciliationService';
import { parseAndValidateQuestionBankCsv } from '../services/questionBankValidator';
import { getDisplayName } from '../services/userSettingsService';
import { saveBlobWithPicker, type SaveBlobResult } from '../services/fileSaveService';
import {
  buildWrongQuestionFilterOptions,
  buildWrongQuestionPdfModel,
  exportWrongQuestionPdf,
  filterWrongChoiceQuestions,
  getAllFilterValue,
  loadWrongQuestionRecords,
} from '../services/wrongQuestionExportService';
import type { JlsBackup, RestorePreview } from '../types/JlsBackup';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';
import type { QuestionBankValidationResult } from '../types/QuestionBankValidation';
import type { WrongQuestionFilters } from '../types/WrongQuestionExport';

interface QuestionBankState {
  validation: QuestionBankValidationResult;
  importedAt?: string;
  source: 'default' | 'imported';
}

type LibraryModal = 'wrongQuestions' | 'backup' | 'restore' | null;
type ModalActionStatus = 'idle' | 'processing' | 'success' | 'error';
type ExportCsvStatus = 'idle' | 'processing' | 'success' | 'error';
type ActionMessage = {
  kind: 'success' | 'error';
  text: string;
};

const CSV_TEMPLATE_FILENAME = 'JLS_question_template.csv';
const ALL = getAllFilterValue();
const INITIAL_WRONG_QUESTION_FILTERS: WrongQuestionFilters = {
  year: ALL,
  subject: ALL,
  learningTheme: ALL,
};

export default function QuestionBankPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<QuestionBankState | null>(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [importMessage, setImportMessage] = useState<ActionMessage | null>(null);
  const [exportCsvMessage, setExportCsvMessage] = useState<ActionMessage | null>(null);
  const [exportCsvStatus, setExportCsvStatus] = useState<ExportCsvStatus>('idle');
  const [wrongQuestionModalMessage, setWrongQuestionModalMessage] = useState('');
  const [wrongQuestionModalMessageType, setWrongQuestionModalMessageType] = useState<'success' | 'error'>('success');
  const [wrongQuestionExportStatus, setWrongQuestionExportStatus] = useState<ModalActionStatus>('idle');
  const [backupModalMessage, setBackupModalMessage] = useState('');
  const [backupModalMessageType, setBackupModalMessageType] = useState<'success' | 'error'>('success');
  const [backupStatus, setBackupStatus] = useState<ModalActionStatus>('idle');
  const [activeModal, setActiveModal] = useState<LibraryModal>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [wrongQuestionQuestions, setWrongQuestionQuestions] = useState<Question[]>([]);
  const [wrongQuestionFilters, setWrongQuestionFilters] = useState<WrongQuestionFilters>(INITIAL_WRONG_QUESTION_FILTERS);
  const [recordsByQuestionId, setRecordsByQuestionId] = useState<Record<string, LearningRecord>>({});
  const [questionIdentitiesById, setQuestionIdentitiesById] = useState<Record<string, QuestionIdentitySnapshot>>({});
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [pendingRestoreBackup, setPendingRestoreBackup] = useState<JlsBackup | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadLibrary() {
      try {
        const metadata = (await getActiveQuestionBankMetadata()) ?? (await getActiveQuestionBank()).metadata;

        if (isActive) {
          setState({
            validation: metadata.validation,
            importedAt: metadata.importedAt,
            source: metadata.source,
          });
        }
      } catch (unknownError) {
        setError(unknownError instanceof Error ? unknownError.message : 'Library 載入失敗。');
      }
    }

    void loadLibrary();

    return () => {
      isActive = false;
    };
  }, []);

  const wrongQuestionFilterOptions = useMemo(
    () =>
      buildWrongQuestionFilterOptions(
        wrongQuestionQuestions,
        wrongQuestionFilters,
        recordsByQuestionId,
        questionIdentitiesById,
      ),
    [questionIdentitiesById, recordsByQuestionId, wrongQuestionQuestions, wrongQuestionFilters],
  );
  const wrongQuestionItems = useMemo(
    () => filterWrongChoiceQuestions(wrongQuestionQuestions, recordsByQuestionId, wrongQuestionFilters, questionIdentitiesById),
    [questionIdentitiesById, recordsByQuestionId, wrongQuestionQuestions, wrongQuestionFilters],
  );

  async function handleImportCsv(file: File | undefined) {
    if (!file) {
      return;
    }

    setImportMessage(null);
    setError('');

    try {
      const csvText = await readQuestionBankCsvFile(file);
      const parsedQuestionBank = parseAndValidateQuestionBankCsv(csvText);
      const { validation } = parsedQuestionBank;

      if (!validation.isValid) {
        setState((current) => (current ? { ...current, validation } : null));
        setImportMessage({ kind: 'error', text: '匯入失敗。驗證結果：' + formatValidationCounts(validation) });
        return;
      }

      const activeQuestionBank = await saveParsedImportedQuestionBank(csvText, parsedQuestionBank);
      setState({
        validation: activeQuestionBank.validation,
        importedAt: activeQuestionBank.importedAt,
        source: 'imported',
      });
      setWrongQuestionQuestions([]);
      setImportMessage({
        kind: 'success',
        text:
          '匯入成功！共 ' +
          validation.summary.totalQuestions +
          ' 題。學習主題：' +
          validation.summary.learningThemeCount +
          '。核心概念：' +
          validation.summary.knowledgeNodeCount +
          '。',
      });
    } catch (unknownError) {
      setImportMessage({ kind: 'error', text: unknownError instanceof Error ? unknownError.message : '匯入題庫失敗。' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleResetQuestionBank() {
    await resetImportedQuestionBank();
    const metadata = await getActiveQuestionBankMetadata();
    setState({
      validation: metadata?.validation ?? (await getActiveQuestionBank()).validation,
      importedAt: undefined,
      source: 'default',
    });
    setWrongQuestionQuestions([]);
    setStatusMessage('已切回預設題庫。');
  }

  function handleExportCsvTemplate() {
    if (exportCsvStatus === 'processing') {
      return;
    }

    setExportCsvMessage(null);
    setExportCsvStatus('processing');

    void exportCsvTemplate()
      .then((result) => {
        if (result === 'cancelled') {
          setExportCsvStatus('idle');
          return;
        }

        setExportCsvStatus('success');
        setExportCsvMessage({ kind: 'success', text: 'CSV 範本已匯出。' });
      })
      .catch((unknownError) => {
        if (import.meta.env.DEV) {
          console.error('[JLS CSV template export]', unknownError);
        }
        setExportCsvStatus('error');
        setExportCsvMessage({ kind: 'error', text: 'CSV 範本匯出失敗，請重新嘗試。' });
      });
  }

  async function openWrongQuestionModal() {
    setStatusMessage('');
    setWrongQuestionModalMessage('');
    setWrongQuestionModalMessageType('success');
    setWrongQuestionExportStatus('idle');
    setWrongQuestionFilters(INITIAL_WRONG_QUESTION_FILTERS);
    setIsBusy(true);

    try {
      const questions = await getActiveQuestions();
      const loadedRecords = await loadWrongQuestionRecords();
      const reconciledRecords = await reconcileLearningRecordsForQuestionBank(loadedRecords, questions);
      await saveIsolatedLearningRecords([...reconciledRecords.orphaned, ...reconciledRecords.conflicted]);
      setWrongQuestionQuestions(questions);
      setRecordsByQuestionId(reconciledRecords.records);
      setQuestionIdentitiesById(await buildQuestionIdentitySnapshots(questions));
      setActiveModal('wrongQuestions');
    } catch (unknownError) {
      setStatusMessage(unknownError instanceof Error ? unknownError.message : '錯題本資料載入失敗。');
    } finally {
      setIsBusy(false);
    }
  }

  function openBackupModal() {
    setStatusMessage('');
    setBackupModalMessage('');
    setBackupModalMessageType('success');
    setBackupStatus('idle');
    setActiveModal('backup');
  }

  async function handleExportWrongQuestions() {
    if (wrongQuestionItems.length === 0) {
      return;
    }

    setIsBusy(true);
    setStatusMessage('');
    setWrongQuestionModalMessage('');
    setWrongQuestionModalMessageType('success');
    setWrongQuestionExportStatus('processing');

    try {
      const displayName = await getDisplayName();
      const model = buildWrongQuestionPdfModel({ displayName, items: wrongQuestionItems });
      const result = await exportWrongQuestionPdf(model);

      if (result === 'cancelled') {
        setWrongQuestionExportStatus('idle');
        return;
      }

      setWrongQuestionModalMessage('錯題本已匯出完成，請至瀏覽器下載資料夾查看。');
      setWrongQuestionModalMessageType('success');
      setWrongQuestionExportStatus('success');
    } catch (unknownError) {
      setWrongQuestionModalMessage(unknownError instanceof Error ? unknownError.message : '匯出錯題本失敗。');
      setWrongQuestionModalMessageType('error');
      setWrongQuestionExportStatus('error');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownloadBackup() {
    setIsBusy(true);
    setStatusMessage('');
    setBackupModalMessage('');
    setBackupModalMessageType('success');
    setBackupStatus('processing');

    try {
      const backup = await createJlsBackup();
      const result = await downloadJlsBackup(backup);

      if (result === 'cancelled') {
        setBackupStatus('idle');
        return;
      }

      setBackupModalMessage('備份已完成，請至瀏覽器下載資料夾查看。');
      setBackupModalMessageType('success');
      setBackupStatus('success');
    } catch (unknownError) {
      setBackupModalMessage(unknownError instanceof Error ? unknownError.message : '備份失敗。');
      setBackupModalMessageType('error');
      setBackupStatus('error');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestoreFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setStatusMessage('');

    try {
      const text = await file.text();
      const validation = parseAndValidateBackup(text);

      if (!validation.isValid || !validation.backup) {
        setStatusMessage(validation.errors[0] ?? '還原檔案格式不正確。');
        return;
      }

      setPendingRestoreBackup(validation.backup);
      setRestorePreview(createRestorePreview(validation.backup));
      setActiveModal('restore');
    } catch (unknownError) {
      setStatusMessage(unknownError instanceof Error ? unknownError.message : '還原檔案讀取失敗。');
    } finally {
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    }
  }

  async function handleConfirmRestore() {
    if (!pendingRestoreBackup) {
      return;
    }

    setIsBusy(true);
    setStatusMessage('');

    try {
      await restoreJlsBackup(pendingRestoreBackup);
      setStatusMessage('還原完成，頁面即將重新整理。');
      setActiveModal(null);
      window.setTimeout(() => window.location.reload(), 600);
    } catch (unknownError) {
      setStatusMessage(unknownError instanceof Error ? unknownError.message : '還原失敗。');
    } finally {
      setIsBusy(false);
    }
  }

  function closeModal() {
    if (isBusy) {
      return;
    }

    setActiveModal(null);
    setRestorePreview(null);
    setPendingRestoreBackup(null);
    setWrongQuestionModalMessage('');
    setWrongQuestionModalMessageType('success');
    setWrongQuestionExportStatus('idle');
    setBackupModalMessage('');
    setBackupModalMessageType('success');
    setBackupStatus('idle');
    setQuestionIdentitiesById({});
    setWrongQuestionQuestions([]);
  }

  if (error) {
    return (
      <section className="status-page">
        <h1>Library</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!state) {
    return <div className="status-page">Library 載入中...</div>;
  }

  return (
    <section className="question-bank-page">
      <header className="page-header">
        <h1>Library</h1>
        <p>學習資源管理</p>
      </header>

      <section className="library-actions" aria-label="Library actions">
        <button className="library-action-button" type="button" onClick={() => fileInputRef.current?.click()}>
          <span aria-hidden="true">📥</span>
          匯入題庫
        </button>
        <input
          ref={fileInputRef}
          accept=".csv,text/csv"
          className="visually-hidden"
          type="file"
          onChange={(event) => void handleImportCsv(event.target.files?.[0])}
        />
        <button
          className="library-action-button"
          disabled={exportCsvStatus === 'processing'}
          type="button"
          onClick={handleExportCsvTemplate}
        >
          <span aria-hidden="true">📤</span>
          {exportCsvStatus === 'processing' ? '正在匯出...' : '匯出 CSV 範本'}
        </button>
      </section>

      {statusMessage ? <p className="form-status">{statusMessage}</p> : null}

      <CsvStatusPanel exportCsvMessage={exportCsvMessage} importMessage={importMessage} validation={state.validation} />

      <section className="today-card">
        <span className="today-card__label">目前題庫</span>
        <h2>{state.source === 'imported' ? '使用自訂題庫' : '預設題庫'}</h2>
        <p>
          {state.source === 'imported' && state.importedAt
            ? '匯入時間：' + formatDateTime(state.importedAt)
            : '目前使用 public/questions.csv。'}
        </p>
        {state.source === 'imported' ? (
          <button className="secondary-button" type="button" onClick={handleResetQuestionBank}>
            切回預設題庫
          </button>
        ) : null}
      </section>

      <details className="disclosure-card">
        <summary>📦 更多功能</summary>
        <div className="library-actions library-actions--compact">
          <button className="library-action-button" type="button" onClick={() => void openWrongQuestionModal()}>
            匯出錯題本
          </button>
          <button className="library-action-button" type="button" onClick={openBackupModal}>
            備份
          </button>
          <button className="library-action-button" type="button" onClick={() => restoreInputRef.current?.click()}>
            還原
          </button>
          <input
            ref={restoreInputRef}
            accept=".json,application/json"
            className="visually-hidden"
            type="file"
            onChange={(event) => void handleRestoreFile(event.target.files?.[0])}
          />
        </div>
      </details>

      <details className="disclosure-card">
        <summary>📊 題庫資訊</summary>
        <div className="knowledge-summary">
          <div><span>題目總數</span><strong>{state.validation.summary.totalQuestions}</strong></div>
          <div><span>年度</span><strong>{state.validation.summary.yearCount}</strong></div>
          <div><span>科目</span><strong>{state.validation.summary.subjectCount}</strong></div>
          <div><span>學習主題</span><strong>{state.validation.summary.learningThemeCount}</strong></div>
          <div><span>核心概念</span><strong>{state.validation.summary.knowledgeNodeCount}</strong></div>
          <div><span>選擇題</span><strong>{state.validation.summary.choiceQuestionCount}</strong></div>
          <div><span>非選題</span><strong>{state.validation.summary.essayQuestionCount}</strong></div>
        </div>
      </details>

      {activeModal === 'wrongQuestions' ? (
        <Modal isBusy={isBusy} title="匯出錯題本" onClose={closeModal}>
          <div className="modal-form">
            <label className="form-field">
              <span>年度</span>
              <select
                value={wrongQuestionFilters.year}
                onChange={(event) => setWrongQuestionFilters({ year: event.target.value, subject: ALL, learningTheme: ALL })}
              >
                {wrongQuestionFilterOptions.years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>科目</span>
              <select
                value={wrongQuestionFilters.subject}
                onChange={(event) =>
                  setWrongQuestionFilters((current) => ({ ...current, subject: event.target.value, learningTheme: ALL }))
                }
              >
                {wrongQuestionFilterOptions.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>學習主題</span>
              <select
                value={wrongQuestionFilters.learningTheme}
                onChange={(event) => setWrongQuestionFilters((current) => ({ ...current, learningTheme: event.target.value }))}
              >
                {wrongQuestionFilterOptions.learningThemes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}
              </select>
            </label>
            <p>符合條件的錯題共 {wrongQuestionItems.length} 題</p>
            {wrongQuestionItems.length === 0 ? <p className="form-error">目前沒有符合條件的錯題。</p> : null}
            {wrongQuestionModalMessage ? (
              <p className={wrongQuestionModalMessageType === 'success' ? 'form-status' : 'form-error'}>
                {wrongQuestionModalMessage}
              </p>
            ) : null}
            <div className="modal-actions">
              {wrongQuestionExportStatus === 'success' ? null : (
                <button className="secondary-button" disabled={isBusy} type="button" onClick={closeModal}>取消</button>
              )}
              {wrongQuestionExportStatus === 'success' ? (
                <button className="primary-button" type="button" onClick={closeModal}>完成</button>
              ) : (
                <button className="primary-button" disabled={isBusy || wrongQuestionItems.length === 0} type="button" onClick={() => void handleExportWrongQuestions()}>
                  {wrongQuestionExportStatus === 'processing' ? '正在產生 PDF...' : '匯出 PDF'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      ) : null}

      {activeModal === 'backup' ? (
        <Modal isBusy={isBusy} title="備份" onClose={closeModal}>
          <div className="modal-form">
            <p>備份會包含學習紀錄、設定與進度資料，不包含題庫全文。</p>
            {backupModalMessage ? <p className={backupModalMessageType === 'success' ? 'form-status' : 'form-error'}>{backupModalMessage}</p> : null}
            <div className="modal-actions">
              {backupStatus === 'success' ? null : <button className="secondary-button" disabled={isBusy} type="button" onClick={closeModal}>取消</button>}
              {backupStatus === 'success' ? (
                <button className="primary-button" type="button" onClick={closeModal}>完成</button>
              ) : (
                <button className="primary-button" disabled={isBusy} type="button" onClick={() => void handleDownloadBackup()}>
                  {backupStatus === 'processing' ? '備份中...' : '下載備份'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      ) : null}

      {activeModal === 'restore' && restorePreview ? (
        <Modal isBusy={isBusy} title="還原" onClose={closeModal}>
          <div className="modal-form">
            <dl className="restore-preview">
              <div><dt>備份時間</dt><dd>{formatDateTime(restorePreview.createdAt)}</dd></div>
              <div><dt>備份版本</dt><dd>{restorePreview.backupVersion}</dd></div>
            </dl>
            <p className="form-error">還原會覆蓋目前的學習紀錄與設定，題庫不會被備份檔取代。</p>
            <div className="modal-actions">
              <button className="secondary-button" disabled={isBusy} type="button" onClick={closeModal}>取消</button>
              <button className="primary-button" disabled={isBusy} type="button" onClick={() => void handleConfirmRestore()}>
                {isBusy ? '還原中...' : '確認還原'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

export function CsvStatusPanel({
  exportCsvMessage,
  importMessage,
  validation,
}: {
  exportCsvMessage: ActionMessage | null;
  importMessage: ActionMessage | null;
  validation: QuestionBankValidationResult;
}) {
  const hasValidationIssues = !validation.isValid || validation.warnings.length > 0;

  if (!importMessage && !exportCsvMessage && !hasValidationIssues) {
    return null;
  }

  return (
    <section className="today-card validation-report">
      <div className="csv-status-messages">
        <ActionMessageText message={importMessage} />
        <ActionMessageText message={exportCsvMessage} />
      </div>
      {hasValidationIssues ? <ValidationReport validation={validation} /> : null}
    </section>
  );
}

export function ValidationReport({ validation }: { validation: QuestionBankValidationResult }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return null;
  }

  return (
    <details className="validation-report__details" onToggle={(event) => setIsExpanded(event.currentTarget.open)}>
      <summary>CSV 驗證提醒：{formatValidationCounts(validation)}</summary>
      {isExpanded ? (
        <>
          <ValidationIssueGroup title="錯誤" issues={validation.errors} />
          <ValidationIssueGroup title="注意" issues={validation.warnings} />
        </>
      ) : null}
    </details>
  );
}

export function ActionMessageText({ message }: { message: ActionMessage | null }) {
  if (!message) {
    return null;
  }

  return (
    <span
      aria-live={message.kind === 'error' ? 'assertive' : 'polite'}
      className={'library-action-message library-action-message--' + message.kind}
      role={message.kind === 'error' ? 'alert' : 'status'}
    >
      {message.text}
    </span>
  );
}

function ValidationIssueGroup({ title, issues }: { title: string; issues: QuestionBankValidationResult['errors'] }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <section>
      <h3>{title}</h3>
      <ul className="question-bank-issues">
        {issues.map((issue) => (
          <li key={[issue.level, issue.rowNumber ?? 'header', issue.field, issue.message].join('-')}>
            <strong>{issue.rowNumber ? '第 ' + issue.rowNumber + ' 列' : '欄位標題'}</strong>
            <span>{issue.field}</span>
            <p>{issue.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export async function exportCsvTemplate(): Promise<SaveBlobResult> {
  return saveBlobWithPicker({
    blob: buildCsvTemplateBlob(),
    suggestedName: CSV_TEMPLATE_FILENAME,
    mimeType: 'text/csv',
    extensions: ['.csv'],
    description: 'CSV 檔案',
    useSavePicker: false,
  });
}

export function buildCsvTemplateBlob(): Blob {
  const csv = buildQuestionBankTemplateCsv();
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

function formatValidationCounts(validation: QuestionBankValidationResult): string {
  return validation.errors.length + ' 個錯誤 / ' + validation.warnings.length + ' 個注意';
}

export function downloadCsvTemplate(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = CSV_TEMPLATE_FILENAME;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
