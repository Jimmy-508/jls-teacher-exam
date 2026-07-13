import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_STORAGE_ALLOWLIST,
  buildBackupFileName,
  createJlsBackup,
  parseAndValidateBackup,
  restoreJlsBackup,
  validateBackup,
} from './backupRestoreService';
import { JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY } from './storageKeys';
import { USER_SETTINGS_STORAGE_KEY } from './userSettingsService';
import { load, remove, save } from './storageService';
import type { JlsBackup } from '../types/JlsBackup';

vi.mock('./storageService', () => ({
  load: vi.fn(),
  remove: vi.fn(async () => undefined),
  save: vi.fn(async () => undefined),
}));

describe('backupRestoreService', () => {
  beforeEach(() => {
    vi.mocked(load).mockReset();
    vi.mocked(save).mockReset();
    vi.mocked(remove).mockReset();
  });

  it('creates backup from allowlisted keys and removes sensitive fields', async () => {
    vi.mocked(load).mockImplementation(async (key: string) => {
      if (key === USER_SETTINGS_STORAGE_KEY) {
        return { displayName: 'Jimmy', openAIApiKey: 'secret-key', nested: { token: 'abc', safe: true } };
      }

      return BACKUP_STORAGE_ALLOWLIST.includes(key as (typeof BACKUP_STORAGE_ALLOWLIST)[number])
        ? { value: key }
        : null;
    });

    const backup = await createJlsBackup(new Date('2026-07-12T10:35:00.000Z'));

    expect(backup.app).toBe('JLS');
    expect(backup.backupVersion).toBe(2);
    expect(backup.includesQuestionBank).toBe(false);
    expect(backup.questionBankIdentity?.algorithm).toBe('SHA-256');
    expect(backup.learningRecordQuestionIdentities).toEqual({});
    expect(backup.data.storage).not.toHaveProperty(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
    expect(JSON.stringify(backup)).not.toContain('openAIApiKey');
    expect(JSON.stringify(backup)).not.toContain('secret-key');
    expect(JSON.stringify(backup)).not.toContain('token');
  });

  it('validates restore input and rejects unsafe data', () => {
    expect(parseAndValidateBackup('{bad json').isValid).toBe(false);
    expect(validateBackup({ app: 'OTHER' }).isValid).toBe(false);
    expect(validateBackup({ ...createBackup(), backupVersion: 999 }).isValid).toBe(false);
    expect(
      validateBackup({
        ...createBackup(),
        data: { storage: { [JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY]: { csvText: 'ID,題幹' } } },
      }).errors[0],
    ).toContain('題庫資料');
    expect(
      validateBackup({
        ...createBackup(),
        data: { storage: { [USER_SETTINGS_STORAGE_KEY]: { openAIApiKey: 'secret' } } },
      }).isValid,
    ).toBe(false);
  });

  it('restores allowlisted keys and rolls back on failure', async () => {
    const backup = createBackup({
      [USER_SETTINGS_STORAGE_KEY]: { displayName: 'Sophia' },
    });
    vi.mocked(load).mockResolvedValue({ displayName: 'Jimmy' });
    vi.mocked(save).mockRejectedValueOnce(new Error('write failed'));

    await expect(restoreJlsBackup(backup)).rejects.toThrow('write failed');

    expect(remove).toHaveBeenCalledWith(USER_SETTINGS_STORAGE_KEY);
    expect(save).toHaveBeenLastCalledWith(USER_SETTINGS_STORAGE_KEY, { displayName: 'Jimmy' });
  });

  it('formats backup filename', () => {
    expect(buildBackupFileName(new Date('2026-07-12T10:35:00'))).toBe('JLS_backup_2026-07-12_103500.json');
  });
});

function createBackup(storage: Record<string, unknown> = {}): JlsBackup {
  return {
    app: 'JLS',
    appVersion: '4.2.0',
    backupVersion: 2,
    createdAt: '2026-07-12T10:35:00.000Z',
    includesQuestionBank: false,
    questionBankIdentity: {
      algorithm: 'SHA-256',
      identityVersion: 1,
      fingerprint: '',
      questionCount: 0,
      generatedAt: '2026-07-12T10:35:00.000Z',
    },
    learningRecordQuestionIdentities: {},
    data: { storage },
  };
}
