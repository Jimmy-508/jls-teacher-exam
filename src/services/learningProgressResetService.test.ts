import { describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
  LAST_PRACTICE_SESSION_STORAGE_KEY,
  LEARNING_PROFILE_STORAGE_KEY,
  LEARNING_RECORDS_STORAGE_KEY,
} from './learningEngine';
import { resetLearningProgress } from './learningProgressResetService';
import { JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY, JLS_LEARNING_RECORDS_STORAGE_KEY } from './storageKeys';
import { USER_SETTINGS_STORAGE_KEY } from './userSettingsService';

vi.mock('./storageService', () => ({
  remove: vi.fn(async () => undefined),
}));

import { remove } from './storageService';

describe('learningProgressResetService', () => {
  it('removes learning progress keys', async () => {
    await resetLearningProgress();

    expect(vi.mocked(remove)).toHaveBeenCalledWith(LEARNING_RECORDS_STORAGE_KEY);
    expect(vi.mocked(remove)).toHaveBeenCalledWith(LEARNING_PROFILE_STORAGE_KEY);
    expect(vi.mocked(remove)).toHaveBeenCalledWith(ACTIVE_PRACTICE_SESSION_STORAGE_KEY);
    expect(vi.mocked(remove)).toHaveBeenCalledWith(LAST_PRACTICE_SESSION_STORAGE_KEY);
    expect(vi.mocked(remove)).toHaveBeenCalledWith(JLS_LEARNING_RECORDS_STORAGE_KEY);
  });

  it('does not remove imported question bank or user name settings', async () => {
    await resetLearningProgress();

    expect(vi.mocked(remove)).not.toHaveBeenCalledWith(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
    expect(vi.mocked(remove)).not.toHaveBeenCalledWith(USER_SETTINGS_STORAGE_KEY);
  });
});
