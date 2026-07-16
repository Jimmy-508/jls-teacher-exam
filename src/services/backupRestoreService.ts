import {
  ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
  LAST_PRACTICE_SESSION_STORAGE_KEY,
  LEARNING_PROFILE_STORAGE_KEY,
  LEARNING_RECORDS_STORAGE_KEY,
} from './learningEngine';
import { reconcileLearningRecordsForQuestionBank, saveIsolatedLearningRecords } from './learningRecordReconciliationService';
import { getActiveQuestions } from './questionBankStorageService';
import { buildQuestionBankIdentity, buildQuestionIdentitySnapshots } from './questionBankIdentityService';
import { JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY, JLS_LEARNING_RECORDS_STORAGE_KEY } from './storageKeys';
import { saveBlobWithPicker, type SaveBlobResult } from './fileSaveService';
import { load, remove, save } from './storageService';
import { TODAY_PRACTICE_HISTORY_STORAGE_KEY } from './todayPracticeHistoryService';
import { USER_SETTINGS_STORAGE_KEY } from './userSettingsService';
import type { BackupValidationResult, JlsBackup, RestorePreview } from '../types/JlsBackup';
import type { LearningRecord } from '../types/LearningRecord';
import { APP_PACKAGE_VERSION } from '../config/appInfo';

export const JLS_BACKUP_VERSION = 2;

export const BACKUP_STORAGE_ALLOWLIST = [
  LEARNING_RECORDS_STORAGE_KEY,
  LEARNING_PROFILE_STORAGE_KEY,
  ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
  LAST_PRACTICE_SESSION_STORAGE_KEY,
  JLS_LEARNING_RECORDS_STORAGE_KEY,
  TODAY_PRACTICE_HISTORY_STORAGE_KEY,
  USER_SETTINGS_STORAGE_KEY,
] as const;

export const BACKUP_STORAGE_DENYLIST = [JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY] as const;

const SENSITIVE_KEY_PATTERN = /(apiKey|openAIApiKey|token|secret|password)/i;

export async function createJlsBackup(now = new Date()): Promise<JlsBackup> {
  const storage: Record<string, unknown> = {};

  for (const key of BACKUP_STORAGE_ALLOWLIST) {
    if (BACKUP_STORAGE_DENYLIST.includes(key as (typeof BACKUP_STORAGE_DENYLIST)[number])) {
      continue;
    }

    const value = await load<unknown>(key);

    if (value !== null) {
      storage[key] = sanitizeForBackup(value);
    }
  }

  const { questionBankIdentity, allQuestionIdentities } = await buildBackupIdentityMetadata(now);
  const learningRecords = normalizeBackupLearningRecords(storage[LEARNING_RECORDS_STORAGE_KEY]);
  const learningRecordQuestionIdentities = Object.fromEntries(
    Object.keys(learningRecords)
      .map((questionId) => [questionId, allQuestionIdentities[questionId]] as const)
      .filter(([, identity]) => Boolean(identity)),
  );

  return {
    app: 'JLS',
    backupVersion: JLS_BACKUP_VERSION,
    createdAt: now.toISOString(),
    appVersion: APP_PACKAGE_VERSION,
    includesQuestionBank: false,
    questionBankIdentity,
    learningRecordQuestionIdentities,
    data: {
      storage,
    },
  };
}

async function buildBackupIdentityMetadata(now: Date): Promise<{
  questionBankIdentity: JlsBackup['questionBankIdentity'];
  allQuestionIdentities: NonNullable<JlsBackup['learningRecordQuestionIdentities']>;
}> {
  try {
    const activeQuestions = await getActiveQuestions();

    return {
      questionBankIdentity: await buildQuestionBankIdentity(activeQuestions, now.toISOString()),
      allQuestionIdentities: await buildQuestionIdentitySnapshots(activeQuestions),
    };
  } catch {
    return {
      questionBankIdentity: {
        algorithm: 'SHA-256',
        identityVersion: 1,
        fingerprint: '',
        questionCount: 0,
        generatedAt: now.toISOString(),
      },
      allQuestionIdentities: {},
    };
  }
}

export function serializeBackup(backup: JlsBackup): string {
  return JSON.stringify(backup, null, 2);
}

export async function downloadJlsBackup(backup: JlsBackup): Promise<SaveBlobResult> {
  const blob = new Blob([serializeBackup(backup)], { type: 'application/json;charset=utf-8' });
  return saveBlobWithPicker({
    blob,
    suggestedName: buildBackupFileName(new Date(backup.createdAt)),
    mimeType: 'application/json',
    extensions: ['.json'],
    description: 'JLS 備份檔',
    useSavePicker: false,
  });
}

export function parseAndValidateBackup(jsonText: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return validateBackup(parsed);
  } catch {
    return {
      isValid: false,
      errors: ['無法還原：這不是有效的 JLS 備份檔。'],
    };
  }
}

export function validateBackup(value: unknown): BackupValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(value)) {
    return {
      isValid: false,
      errors: ['無法還原：這不是有效的 JLS 備份檔。'],
    };
  }

  if (value.app !== 'JLS') {
    errors.push('無法還原：這不是有效的 JLS 備份檔。');
  }

  if (value.backupVersion !== 1 && value.backupVersion !== JLS_BACKUP_VERSION) {
    errors.push('無法還原：此備份版本目前不支援。');
  }

  if (typeof value.createdAt !== 'string' || Number.isNaN(new Date(value.createdAt).getTime())) {
    errors.push('無法還原：備份日期格式不正確。');
  }

  if (value.includesQuestionBank !== false) {
    errors.push('此備份檔包含不允許還原的題庫資料，已停止還原。');
  }

  if (!isPlainObject(value.data) || !isPlainObject(value.data.storage)) {
    errors.push('無法還原：這不是有效的 JLS 備份檔。');
  }

  const storage = isPlainObject(value.data) && isPlainObject(value.data.storage) ? value.data.storage : {};

  Object.entries(storage).forEach(([key, storedValue]) => {
    if (!isAllowedStorageKey(key)) {
      errors.push(
        BACKUP_STORAGE_DENYLIST.includes(key as (typeof BACKUP_STORAGE_DENYLIST)[number])
          ? '此備份檔包含不允許還原的題庫資料，已停止還原。'
          : `無法還原：備份含有不允許的資料項目 ${key}。`,
      );
    }

    if (containsSensitiveKey(storedValue)) {
      errors.push('無法還原：備份含有敏感憑證欄位。');
    }
  });

  if (containsQuestionBankContent(storage)) {
    errors.push('此備份檔包含不允許還原的題庫資料，已停止還原。');
  }

  return {
    isValid: errors.length === 0,
    errors,
    backup: errors.length === 0 ? (value as unknown as JlsBackup) : undefined,
  };
}

export function createRestorePreview(backup: JlsBackup): RestorePreview {
  return {
    backupVersion: backup.backupVersion,
    createdAt: backup.createdAt,
    includesQuestionBank: backup.includesQuestionBank,
    storageKeys: Object.keys(backup.data.storage),
  };
}

export async function restoreJlsBackup(backup: JlsBackup): Promise<void> {
  const validation = validateBackup(backup);

  if (!validation.isValid) {
    throw new Error(validation.errors[0] ?? '無法還原：這不是有效的 JLS 備份檔。');
  }

  const restorableStorage = await getRestorableStorage(backup);
  const entries = Object.entries(restorableStorage);
  const snapshots = new Map<string, unknown | null>();

  for (const [key] of entries) {
    snapshots.set(key, await load<unknown>(key));
  }

  try {
    for (const [key, value] of entries) {
      await remove(key);
      await save(key, value);
    }
  } catch (error) {
    for (const [key, value] of snapshots.entries()) {
      await remove(key);

      if (value !== null) {
        await save(key, value);
      }
    }

    throw error;
  }
}

async function getRestorableStorage(backup: JlsBackup): Promise<Record<string, unknown>> {
  if (backup.backupVersion === 1) {
    return Object.fromEntries(
      Object.entries(backup.data.storage).filter(([key]) => key === USER_SETTINGS_STORAGE_KEY),
    );
  }

  const storage = { ...backup.data.storage };
  const records = normalizeBackupLearningRecords(storage[LEARNING_RECORDS_STORAGE_KEY]);

  if (Object.keys(records).length > 0) {
    const activeQuestions = await getActiveQuestions();
    const reconciliation = await reconcileLearningRecordsForQuestionBank(records, activeQuestions);
    storage[LEARNING_RECORDS_STORAGE_KEY] = reconciliation.records;
    await saveIsolatedLearningRecords([...reconciliation.orphaned, ...reconciliation.conflicted]);
  }

  return storage;
}

function normalizeBackupLearningRecords(value: unknown): Record<string, LearningRecord> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  if (Array.isArray(value)) {
    return Object.fromEntries(value.filter(isLearningRecordLike).map((record) => [record.questionId, record]));
  }

  return Object.fromEntries(Object.entries(value).filter(([, record]) => isLearningRecordLike(record)));
}

function isLearningRecordLike(value: unknown): value is LearningRecord {
  return typeof value === 'object' && value !== null && 'questionId' in value && typeof value.questionId === 'string';
}

export function buildBackupFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `JLS_backup_${year}-${month}-${day}_${hour}${minute}${second}.json`;
}

function sanitizeForBackup(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeForBackup);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
        .map(([key, nestedValue]) => [key, sanitizeForBackup(nestedValue)]),
    );
  }

  return value;
}

function containsSensitiveKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsSensitiveKey);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).some(([key, nestedValue]) => SENSITIVE_KEY_PATTERN.test(key) || containsSensitiveKey(nestedValue));
  }

  return false;
}

function containsQuestionBankContent(storage: Record<string, unknown>): boolean {
  return Object.entries(storage).some(([key, value]) => {
    if (BACKUP_STORAGE_DENYLIST.includes(key as (typeof BACKUP_STORAGE_DENYLIST)[number])) {
      return true;
    }

    return isPlainObject(value) && ('csvText' in value || 'questions' in value || 'validation' in value);
  });
}

function isAllowedStorageKey(key: string): boolean {
  return BACKUP_STORAGE_ALLOWLIST.includes(key as (typeof BACKUP_STORAGE_ALLOWLIST)[number]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
