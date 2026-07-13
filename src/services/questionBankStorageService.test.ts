import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY } from './storageKeys';

const storage = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
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

import { load, remove, save } from './storageService';
import {
  getActiveQuestionBank,
  getImportedQuestionBank,
  resetImportedQuestionBank,
  saveImportedQuestionBank,
} from './questionBankStorageService';

describe('questionBankStorageService', () => {
  beforeEach(() => {
    storage.values.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('saves imported CSV through StorageService', async () => {
    await saveImportedQuestionBank('ID,年度\nQ1,113');

    expect(vi.mocked(save)).toHaveBeenCalledWith(
      JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY,
      expect.objectContaining({ csvText: 'ID,年度\nQ1,113' }),
    );
  });

  it('loads imported CSV through StorageService', async () => {
    await saveImportedQuestionBank('ID,年度\nQ1,113');
    const imported = await getImportedQuestionBank();

    expect(vi.mocked(load)).toHaveBeenCalledWith(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
    expect(imported?.csvText).toBe('ID,年度\nQ1,113');
  });

  it('uses imported question bank when available', async () => {
    await saveImportedQuestionBank('ID,年度\nQ1,113');

    const activeQuestionBank = await getActiveQuestionBank();

    expect(activeQuestionBank.source).toBe('imported');
    expect(activeQuestionBank.csvText).toBe('ID,年度\nQ1,113');
  });

  it('falls back to default question bank when no imported bank exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => 'ID,年度\nQ2,113',
      })),
    );

    const activeQuestionBank = await getActiveQuestionBank();

    expect(activeQuestionBank.source).toBe('default');
    expect(activeQuestionBank.csvText).toBe('ID,年度\nQ2,113');
  });

  it('reset removes imported question bank', async () => {
    await saveImportedQuestionBank('ID,年度\nQ1,113');
    await resetImportedQuestionBank();

    expect(vi.mocked(remove)).toHaveBeenCalledWith(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
    expect(await getImportedQuestionBank()).toBeNull();
  });
});
