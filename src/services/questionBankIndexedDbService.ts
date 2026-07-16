import type { Question } from '../types/question';
import type { QuestionBankValidationResult } from '../types/QuestionBankValidation';

export const QUESTION_BANK_DB_NAME = 'JLSQuestionBankDB';
export const QUESTION_BANK_DB_VERSION = 1;
export const QUESTION_BANK_METADATA_STORE = 'questionBankMetadata';
export const QUESTION_BANK_QUESTIONS_STORE = 'questions';
export const ACTIVE_QUESTION_BANK_METADATA_ID = 'active';
export const QUESTION_BANK_SCHEMA_VERSION = 1;

export interface StoredQuestionBankMetadata {
  id: typeof ACTIVE_QUESTION_BANK_METADATA_ID;
  source: 'default' | 'imported';
  importedAt?: string;
  updatedAt: string;
  schemaVersion: number;
  questionCount: number;
  validation: QuestionBankValidationResult;
  summary: QuestionBankValidationResult['summary'];
  fingerprint?: string;
  defaultBankVersion?: string;
}

export interface StoredQuestionBank {
  metadata: StoredQuestionBankMetadata;
  questions: Question[];
}

export class QuestionBankIndexedDbError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'QuestionBankIndexedDbError';
  }
}

export async function getStoredQuestionBankMetadata(): Promise<StoredQuestionBankMetadata | null> {
  const db = await openQuestionBankDb();

  try {
    return requestToPromise<StoredQuestionBankMetadata | undefined>(
      db.transaction(QUESTION_BANK_METADATA_STORE, 'readonly')
        .objectStore(QUESTION_BANK_METADATA_STORE)
        .get(ACTIVE_QUESTION_BANK_METADATA_ID),
    ).then((metadata) => metadata ?? null);
  } finally {
    db.close();
  }
}

export async function getStoredQuestions(): Promise<Question[]> {
  const db = await openQuestionBankDb();

  try {
    return requestToPromise<Question[]>(
      db.transaction(QUESTION_BANK_QUESTIONS_STORE, 'readonly')
        .objectStore(QUESTION_BANK_QUESTIONS_STORE)
        .getAll(),
    );
  } catch (error) {
    throw toQuestionBankDbError('題庫載入失敗。', error);
  } finally {
    db.close();
  }
}

export async function getStoredQuestionBank(): Promise<StoredQuestionBank | null> {
  const db = await openQuestionBankDb();

  try {
    const transaction = db.transaction([QUESTION_BANK_METADATA_STORE, QUESTION_BANK_QUESTIONS_STORE], 'readonly');
    const metadata = await requestToPromise<StoredQuestionBankMetadata | undefined>(
      transaction.objectStore(QUESTION_BANK_METADATA_STORE).get(ACTIVE_QUESTION_BANK_METADATA_ID),
    );

    if (!metadata) {
      await transactionDone(transaction);
      return null;
    }

    const questions = await requestToPromise<Question[]>(transaction.objectStore(QUESTION_BANK_QUESTIONS_STORE).getAll());
    await transactionDone(transaction);

    return {
      metadata,
      questions,
    };
  } catch (error) {
    throw toQuestionBankDbError('題庫載入失敗。', error);
  } finally {
    db.close();
  }
}

export async function replaceStoredQuestionBank(metadata: StoredQuestionBankMetadata, questions: readonly Question[]): Promise<void> {
  const db = await openQuestionBankDb();

  try {
    const transaction = db.transaction([QUESTION_BANK_METADATA_STORE, QUESTION_BANK_QUESTIONS_STORE], 'readwrite');
    const metadataStore = transaction.objectStore(QUESTION_BANK_METADATA_STORE);
    const questionsStore = transaction.objectStore(QUESTION_BANK_QUESTIONS_STORE);

    questionsStore.clear();
    metadataStore.put(metadata);
    questions.forEach((question) => questionsStore.put(question));

    await transactionDone(transaction);
  } catch (error) {
    throw toQuestionBankDbError('題庫儲存失敗，請確認瀏覽器儲存空間後再試一次。', error);
  } finally {
    db.close();
  }
}

export async function clearStoredQuestionBank(): Promise<void> {
  const db = await openQuestionBankDb();

  try {
    const transaction = db.transaction([QUESTION_BANK_METADATA_STORE, QUESTION_BANK_QUESTIONS_STORE], 'readwrite');
    transaction.objectStore(QUESTION_BANK_METADATA_STORE).clear();
    transaction.objectStore(QUESTION_BANK_QUESTIONS_STORE).clear();
    await transactionDone(transaction);
  } catch (error) {
    throw toQuestionBankDbError('題庫儲存失敗，請確認瀏覽器儲存空間後再試一次。', error);
  } finally {
    db.close();
  }
}

function openQuestionBankDb(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis) || !globalThis.indexedDB) {
    return Promise.reject(new QuestionBankIndexedDbError('題庫資料庫開啟失敗，請重新載入頁面。'));
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(QUESTION_BANK_DB_NAME, QUESTION_BANK_DB_VERSION);

    request.onerror = () => reject(toQuestionBankDbError('題庫資料庫開啟失敗，請重新載入頁面。', request.error));
    request.onblocked = () => reject(new QuestionBankIndexedDbError('題庫資料庫開啟失敗，請重新載入頁面。'));
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(QUESTION_BANK_METADATA_STORE)) {
        db.createObjectStore(QUESTION_BANK_METADATA_STORE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(QUESTION_BANK_QUESTIONS_STORE)) {
        const questionsStore = db.createObjectStore(QUESTION_BANK_QUESTIONS_STORE, { keyPath: 'id' });
        questionsStore.createIndex('year', 'year', { unique: false });
        questionsStore.createIndex('subject', 'subject', { unique: false });
        questionsStore.createIndex('type', 'type', { unique: false });
        questionsStore.createIndex('learningTheme', 'learningTheme', { unique: false });
        questionsStore.createIndex('coreConcept', 'coreConcept', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function toQuestionBankDbError(message: string, cause: unknown): QuestionBankIndexedDbError {
  if (import.meta.env.DEV) {
    console.error('[JLS QuestionBank IndexedDB]', cause);
  }

  return cause instanceof QuestionBankIndexedDbError ? cause : new QuestionBankIndexedDbError(message, cause);
}
