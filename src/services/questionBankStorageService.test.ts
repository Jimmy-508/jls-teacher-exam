import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY } from './storageKeys';

const storage = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
}));

const indexedDb = vi.hoisted(() => ({
  metadata: null as unknown,
  questions: [] as unknown[],
  replaceStoredQuestionBank: vi.fn(async (metadata: unknown, questions: readonly unknown[]) => {
    indexedDb.metadata = metadata;
    indexedDb.questions = [...questions];
  }),
}));

vi.mock('./storageService', () => ({
  load: vi.fn(async <T>(key: string): Promise<T | null> => {
    return (storage.values.get(key) as T | undefined) ?? null;
  }),
  remove: vi.fn(async (key: string): Promise<void> => {
    storage.values.delete(key);
  }),
  save: vi.fn(async <T>(key: string, value: T): Promise<void> => {
    storage.values.set(key, value);
  }),
}));

vi.mock('./questionBankIndexedDbService', () => ({
  ACTIVE_QUESTION_BANK_METADATA_ID: 'active',
  QUESTION_BANK_SCHEMA_VERSION: 1,
  getStoredQuestionBank: vi.fn(async () => {
    return indexedDb.metadata ? { metadata: indexedDb.metadata, questions: indexedDb.questions } : null;
  }),
  getStoredQuestionBankMetadata: vi.fn(async () => indexedDb.metadata),
  getStoredQuestions: vi.fn(async () => indexedDb.questions),
  replaceStoredQuestionBank: indexedDb.replaceStoredQuestionBank,
}));

import { load, remove } from './storageService';
import {
  getActiveQuestionBank,
  getImportedQuestionBank,
  resetImportedQuestionBank,
  saveImportedQuestionBank,
} from './questionBankStorageService';

const validCsv = [
  'ID,年度,類科,科目,題號,題型,分數,類別,核心概念,題幹,A,B,C,D,標準答案',
  'Q1,113,中等學校,教育原理與制度,1,選擇題,2,測驗,形成性評量,題幹,A,B,C,D,B',
].join('\n');

describe('questionBankStorageService', () => {
  beforeEach(() => {
    storage.values.clear();
    indexedDb.metadata = null;
    indexedDb.questions = [];
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('saves imported questions through IndexedDB and removes the legacy localStorage key', async () => {
    await saveImportedQuestionBank(validCsv);

    expect(indexedDb.replaceStoredQuestionBank).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'active',
        source: 'imported',
        questionCount: 1,
      }),
      expect.arrayContaining([expect.objectContaining({ id: 'Q1' })]),
    );
    expect(vi.mocked(remove)).toHaveBeenCalledWith(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
  });

  it('reports imported metadata without returning the full CSV from IndexedDB', async () => {
    await saveImportedQuestionBank(validCsv);
    const imported = await getImportedQuestionBank();

    expect(imported?.csvText).toBe('');
    expect(imported?.importedAt).toBeTruthy();
  });

  it('uses imported IndexedDB question bank when available', async () => {
    await saveImportedQuestionBank(validCsv);

    const activeQuestionBank = await getActiveQuestionBank();

    expect(activeQuestionBank.source).toBe('imported');
    expect(activeQuestionBank.questions).toHaveLength(1);
    expect(activeQuestionBank.summary.totalQuestions).toBe(1);
  });

  it('falls back to default question bank and stores it in IndexedDB', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => validCsv.replace('Q1', 'Q2'),
      })),
    );

    const activeQuestionBank = await getActiveQuestionBank();

    expect(activeQuestionBank.source).toBe('default');
    expect(activeQuestionBank.questions[0].id).toBe('Q2');
    expect(indexedDb.replaceStoredQuestionBank).toHaveBeenCalled();
  });

  it('migrates legacy imported CSV and removes the legacy key only after storing it', async () => {
    storage.values.set(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY, {
      csvText: validCsv,
      importedAt: '2026-07-16T00:00:00.000Z',
    });

    const activeQuestionBank = await getActiveQuestionBank();

    expect(vi.mocked(load)).toHaveBeenCalledWith(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
    expect(activeQuestionBank.source).toBe('imported');
    expect(activeQuestionBank.importedAt).toBe('2026-07-16T00:00:00.000Z');
    expect(vi.mocked(remove)).toHaveBeenCalledWith(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
  });

  it('reset writes the default question bank instead of only removing localStorage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => validCsv.replace('Q1', 'DEFAULT_Q1'),
      })),
    );

    const activeQuestionBank = await resetImportedQuestionBank();

    expect(activeQuestionBank.source).toBe('default');
    expect(activeQuestionBank.questions[0].id).toBe('DEFAULT_Q1');
    expect(indexedDb.replaceStoredQuestionBank).toHaveBeenCalled();
    expect(vi.mocked(remove)).toHaveBeenCalledWith(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
  });
});
