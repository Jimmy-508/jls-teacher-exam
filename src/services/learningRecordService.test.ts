import { describe, beforeEach, expect, it, vi } from 'vitest';
import type { LearningRecord } from '../types/LearningRecord';
import { JLS_LEARNING_RECORDS_STORAGE_KEY } from './storageKeys';

const storage = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
}));

vi.mock('./storageService', () => ({
  load: vi.fn(async <T>(key: string): Promise<T | null> => {
    return (storage.values.get(key) as T | undefined) ?? null;
  }),
  save: vi.fn(async <T>(key: string, value: T): Promise<void> => {
    storage.values.set(key, value);
  }),
}));

import {
  createLearningRecordId,
  findLearningRecord,
  getLearningRecords,
  upsertLearningRecord,
} from './learningRecordService';
import { load, save } from './storageService';

describe('learningRecordService', () => {
  beforeEach(() => {
    storage.values.clear();
    vi.clearAllMocks();
  });

  it('createLearningRecordId produces stable IDs', () => {
    expect(createLearningRecordId(' 教育法規 ', ' 教育基本法 ')).toBe('教育法規::教育基本法');
  });

  it('upsertLearningRecord adds a record', async () => {
    const record = createRecord('教育法規', '教育基本法', 40);

    await upsertLearningRecord(record);

    expect(await getLearningRecords()).toEqual([record]);
  });

  it('upsertLearningRecord overwrites a record with the same ID', async () => {
    await upsertLearningRecord(createRecord('教育法規', '教育基本法', 40));
    await upsertLearningRecord(createRecord('教育法規', '教育基本法', 80));

    const records = await getLearningRecords();
    expect(records).toHaveLength(1);
    expect(records[0].mastery).toBe(80);
  });

  it('findLearningRecord finds a record by learningTheme and knowledgeNode', async () => {
    const record = createRecord('教育法規', '教育基本法', 75);

    await upsertLearningRecord(record);

    expect(await findLearningRecord('教育法規', '教育基本法')).toEqual(record);
    expect(await findLearningRecord('教育法規', '教師法')).toBeNull();
  });

  it('uses StorageService instead of direct localStorage access', async () => {
    await upsertLearningRecord(createRecord('教育法規', '教育基本法', 70));

    expect(vi.mocked(load)).toHaveBeenCalledWith(JLS_LEARNING_RECORDS_STORAGE_KEY);
    expect(vi.mocked(save)).toHaveBeenCalledWith(JLS_LEARNING_RECORDS_STORAGE_KEY, expect.any(Array));
  });
});

function createRecord(learningTheme: string, knowledgeNode: string, mastery: number): LearningRecord {
  const id = createLearningRecordId(learningTheme, knowledgeNode);

  return {
    id,
    learningTheme,
    knowledgeNode,
    mastery,
    reviewCount: 1,
    correctCount: 2,
    wrongCount: 1,
    masteredCount: 2,
    missingCount: 1,
    recentMissing: ['法源依據'],
    updatedAt: '2026-07-07T00:00:00.000Z',
    questionId: id,
    lastCorrect: true,
    familiarity: 2,
    viewedAI: false,
  };
}
