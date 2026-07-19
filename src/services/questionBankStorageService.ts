import { APP_PACKAGE_VERSION } from '../config/appInfo';
import { normalizeSubjectName } from '../constants/subjectOrder';
import type { Question } from '../types/question';
import type { QuestionBankValidationResult } from '../types/QuestionBankValidation';
import {
  ACTIVE_QUESTION_BANK_METADATA_ID,
  QUESTION_BANK_SCHEMA_VERSION,
  getStoredQuestionBank,
  getStoredQuestionBankMetadata,
  getStoredQuestions,
  replaceStoredQuestionBank,
  type StoredQuestionBankMetadata,
} from './questionBankIndexedDbService';
import { parseAndValidateQuestionBankCsv, type ParsedQuestionBank } from './questionBankValidator';
import { load, remove } from './storageService';
import { JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY } from './storageKeys';

const DEFAULT_QUESTION_BANK_PATH = `${import.meta.env.BASE_URL}questions.csv`;
const DEFAULT_QUESTION_BANK_VERSION = APP_PACKAGE_VERSION;

export interface ImportedQuestionBank {
  csvText: string;
  importedAt: string;
}

export interface ActiveQuestionBank {
  questions: Question[];
  validation: QuestionBankValidationResult;
  summary: QuestionBankValidationResult['summary'];
  source: 'default' | 'imported';
  importedAt?: string;
  metadata: StoredQuestionBankMetadata;
}

export async function getImportedQuestionBank(): Promise<ImportedQuestionBank | null> {
  const metadata = await getStoredQuestionBankMetadata();

  if (metadata?.source !== 'imported') {
    return load<ImportedQuestionBank>(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
  }

  return {
    csvText: '',
    importedAt: metadata.importedAt ?? metadata.updatedAt,
  };
}

export async function saveImportedQuestionBank(csvText: string): Promise<ActiveQuestionBank> {
  const parsed = parseAndValidateQuestionBankCsv(csvText);

  return saveParsedImportedQuestionBank(csvText, parsed);
}

export async function saveParsedImportedQuestionBank(csvText: string, parsed: ParsedQuestionBank): Promise<ActiveQuestionBank> {

  if (!parsed.validation.isValid) {
    throw new Error(`匯入失敗。驗證結果：${parsed.validation.errors.length} 個錯誤 / ${parsed.validation.warnings.length} 個注意`);
  }

  const importedAt = new Date().toISOString();
  const metadata = buildMetadata({
    source: 'imported',
    importedAt,
    validation: parsed.validation,
    questionCount: parsed.questions.length,
    fingerprint: await createTextFingerprint(csvText),
  });

  await replaceStoredQuestionBank(metadata, parsed.questions);
  await remove(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
  dispatchQuestionBankUpdatedEvent();

  return toActiveQuestionBank(metadata, parsed.questions);
}

export async function resetImportedQuestionBank(): Promise<ActiveQuestionBank> {
  const activeQuestionBank = await writeDefaultQuestionBank();
  await remove(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
  dispatchQuestionBankUpdatedEvent();
  return activeQuestionBank;
}

export async function getActiveQuestionBank(): Promise<ActiveQuestionBank> {
  const storedQuestionBank = await getStoredQuestionBank();

  if (storedQuestionBank) {
    if (
      storedQuestionBank.metadata.source === 'default' &&
      storedQuestionBank.metadata.defaultBankVersion !== DEFAULT_QUESTION_BANK_VERSION
    ) {
      return writeDefaultQuestionBank();
    }

    return toActiveQuestionBank(storedQuestionBank.metadata, storedQuestionBank.questions);
  }

  const migratedQuestionBank = await migrateLegacyImportedQuestionBank();

  if (migratedQuestionBank) {
    return migratedQuestionBank;
  }

  return writeDefaultQuestionBank();
}

export async function getActiveQuestions(): Promise<Question[]> {
  const metadata = await getStoredQuestionBankMetadata();

  if (!metadata) {
    return (await getActiveQuestionBank()).questions;
  }

  return normalizeStoredQuestions(await getStoredQuestions());
}

export async function getActiveQuestionBankMetadata(): Promise<StoredQuestionBankMetadata | null> {
  return getStoredQuestionBankMetadata();
}

async function migrateLegacyImportedQuestionBank(): Promise<ActiveQuestionBank | null> {
  const legacyImportedQuestionBank = await load<ImportedQuestionBank>(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);

  if (!legacyImportedQuestionBank) {
    return null;
  }

  try {
    const parsed = parseAndValidateQuestionBankCsv(legacyImportedQuestionBank.csvText);

    if (!parsed.validation.isValid) {
      return null;
    }

    const metadata = buildMetadata({
      source: 'imported',
      importedAt: legacyImportedQuestionBank.importedAt,
      validation: parsed.validation,
      questionCount: parsed.questions.length,
      fingerprint: await createTextFingerprint(legacyImportedQuestionBank.csvText),
    });

    await replaceStoredQuestionBank(metadata, parsed.questions);
    await remove(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);

    return toActiveQuestionBank(metadata, parsed.questions);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[JLS legacy question bank migration]', error);
    }

    return null;
  }
}

async function writeDefaultQuestionBank(): Promise<ActiveQuestionBank> {
  const response = await fetch(DEFAULT_QUESTION_BANK_PATH);

  if (!response.ok) {
    throw new Error('無法讀取 public/questions.csv。');
  }

  const csvText = await response.text();
  const parsed = parseAndValidateQuestionBankCsv(csvText);

  if (!parsed.validation.isValid) {
    throw new Error('預設題庫驗證失敗，請確認 public/questions.csv。');
  }

  const metadata = buildMetadata({
    source: 'default',
    validation: parsed.validation,
    questionCount: parsed.questions.length,
    fingerprint: await createTextFingerprint(csvText),
    defaultBankVersion: DEFAULT_QUESTION_BANK_VERSION,
  });

  await replaceStoredQuestionBank(metadata, parsed.questions);
  return toActiveQuestionBank(metadata, parsed.questions);
}

function buildMetadata({
  source,
  importedAt,
  validation,
  questionCount,
  fingerprint,
  defaultBankVersion,
}: {
  source: 'default' | 'imported';
  importedAt?: string;
  validation: QuestionBankValidationResult;
  questionCount: number;
  fingerprint?: string;
  defaultBankVersion?: string;
}): StoredQuestionBankMetadata {
  const updatedAt = new Date().toISOString();

  return {
    id: ACTIVE_QUESTION_BANK_METADATA_ID,
    source,
    importedAt,
    updatedAt,
    schemaVersion: QUESTION_BANK_SCHEMA_VERSION,
    questionCount,
    validation,
    summary: validation.summary,
    fingerprint,
    defaultBankVersion,
  };
}

function toActiveQuestionBank(metadata: StoredQuestionBankMetadata, questions: Question[]): ActiveQuestionBank {
  const normalizedQuestions = normalizeStoredQuestions(questions);

  return {
    questions: normalizedQuestions,
    validation: metadata.validation,
    summary: metadata.summary,
    source: metadata.source,
    importedAt: metadata.importedAt,
    metadata,
  };
}

function normalizeStoredQuestions(questions: readonly Question[]): Question[] {
  let changed = false;

  const normalizedQuestions = questions.map((question) => {
    const normalizedSubject = normalizeSubjectName(question.subject);

    if (normalizedSubject === question.subject) {
      return question;
    }

    changed = true;

    return {
      ...question,
      subject: normalizedSubject,
    };
  });

  return changed ? normalizedQuestions : [...questions];
}

function dispatchQuestionBankUpdatedEvent(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('jls-question-bank-updated'));
  }
}

async function createTextFingerprint(value: string): Promise<string> {
  if ('crypto' in globalThis && globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  return `${value.length}:${value.slice(0, 64)}:${value.slice(-64)}`;
}
