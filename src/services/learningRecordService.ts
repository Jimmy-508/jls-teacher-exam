import type { LearningRecord } from '../types/LearningRecord';
import { load, save } from './storageService';
import { JLS_LEARNING_RECORDS_STORAGE_KEY } from './storageKeys';

export function createLearningRecordId(learningTheme: string, knowledgeNode: string): string {
  return `${learningTheme.trim()}::${knowledgeNode.trim()}`;
}

export async function getLearningRecords(): Promise<LearningRecord[]> {
  return (await load<LearningRecord[]>(JLS_LEARNING_RECORDS_STORAGE_KEY)) ?? [];
}

export async function saveLearningRecords(records: LearningRecord[]): Promise<void> {
  await save(JLS_LEARNING_RECORDS_STORAGE_KEY, records);
}

export async function upsertLearningRecord(record: LearningRecord): Promise<void> {
  const records = await getLearningRecords();
  const nextRecords = [...records.filter((item) => item.id !== record.id), record];

  await saveLearningRecords(nextRecords);
}

export async function findLearningRecord(
  learningTheme: string,
  knowledgeNode: string,
): Promise<LearningRecord | null> {
  const id = createLearningRecordId(learningTheme, knowledgeNode);
  const records = await getLearningRecords();

  return records.find((record) => record.id === id) ?? null;
}
