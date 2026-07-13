import {
  buildLogicalContentKey,
  buildQuestionIdentityIndex,
  type QuestionIdentitySnapshot,
} from './questionBankIdentityService';
import { JLS_ORPHANED_LEARNING_RECORDS_STORAGE_KEY } from './storageKeys';
import { load, save } from './storageService';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';

export type OrphanReason = 'missing-question' | 'content-mismatch' | 'duplicate-candidate' | 'invalid-identity';

export interface OrphanedLearningRecord {
  originalQuestionId: string;
  logicalKey?: string;
  contentHash?: string;
  record: LearningRecord;
  isolatedAt: string;
  reason: OrphanReason;
}

export interface LearningRecordReconciliationResult {
  records: Record<string, LearningRecord>;
  matched: number;
  remapped: number;
  orphaned: OrphanedLearningRecord[];
  conflicted: OrphanedLearningRecord[];
}

export async function reconcileLearningRecordsForQuestionBank(
  records: Record<string, LearningRecord>,
  questions: readonly Question[],
  isolatedAt = new Date().toISOString(),
): Promise<LearningRecordReconciliationResult> {
  const index = await buildQuestionIdentityIndex(questions);
  const nextRecords: Record<string, LearningRecord> = {};
  const orphaned: OrphanedLearningRecord[] = [];
  const conflicted: OrphanedLearningRecord[] = [];
  let matched = 0;
  let remapped = 0;

  Object.values(records).forEach((record) => {
    const identity = record.questionIdentity;

    if (!identity) {
      orphaned.push(createOrphan(record, isolatedAt, 'invalid-identity'));
      return;
    }

    const key = buildLogicalContentKey(identity.logicalKey, identity.contentHash);
    const candidates = index.byLogicalKeyAndContentHash.get(key) ?? [];

    if (candidates.length === 0) {
      const reason: OrphanReason = (index.byLogicalKey.get(identity.logicalKey)?.length ?? 0) > 0 ? 'content-mismatch' : 'missing-question';
      orphaned.push(createOrphan(record, isolatedAt, reason));
      return;
    }

    if (candidates.length > 1) {
      conflicted.push(createOrphan(record, isolatedAt, 'duplicate-candidate'));
      return;
    }

    const candidate = candidates[0];
    const nextRecord = remapLearningRecord(record, candidate);
    nextRecords[nextRecord.questionId] = nextRecord;

    if (candidate.questionId === record.questionId) {
      matched += 1;
    } else {
      remapped += 1;
    }
  });

  return { records: nextRecords, matched, remapped, orphaned, conflicted };
}

export async function saveIsolatedLearningRecords(records: readonly OrphanedLearningRecord[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const current = (await load<OrphanedLearningRecord[]>(JLS_ORPHANED_LEARNING_RECORDS_STORAGE_KEY)) ?? [];
  await save(JLS_ORPHANED_LEARNING_RECORDS_STORAGE_KEY, [...current, ...records]);
}

function remapLearningRecord(record: LearningRecord, identity: QuestionIdentitySnapshot): LearningRecord {
  return {
    ...record,
    id: identity.questionId,
    questionId: identity.questionId,
    questionIdentity: {
      identityVersion: 1,
      logicalKey: identity.logicalKey,
      contentHash: identity.contentHash,
    },
  };
}

function createOrphan(record: LearningRecord, isolatedAt: string, reason: OrphanReason): OrphanedLearningRecord {
  return {
    originalQuestionId: record.questionId,
    logicalKey: record.questionIdentity?.logicalKey,
    contentHash: record.questionIdentity?.contentHash,
    record,
    isolatedAt,
    reason,
  };
}
