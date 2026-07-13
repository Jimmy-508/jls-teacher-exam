import { normalizeChoiceAnswer } from './wrongQuestionExportService';
import type { Question } from '../types/question';

export interface QuestionBankIdentity {
  algorithm: 'SHA-256';
  identityVersion: 1;
  fingerprint: string;
  questionCount: number;
  generatedAt: string;
}

export interface QuestionIdentitySnapshot {
  questionId: string;
  logicalKey: string;
  contentHash: string;
}

export interface QuestionIdentityIndex {
  byQuestionId: Map<string, QuestionIdentitySnapshot[]>;
  byLogicalKey: Map<string, QuestionIdentitySnapshot[]>;
  byContentHash: Map<string, QuestionIdentitySnapshot[]>;
  byLogicalKeyAndContentHash: Map<string, QuestionIdentitySnapshot[]>;
}

const IDENTITY_SEPARATOR = '|';

export async function buildQuestionBankIdentity(
  questions: readonly Question[],
  generatedAt = new Date().toISOString(),
): Promise<QuestionBankIdentity> {
  const snapshots = await buildQuestionIdentitySnapshots(questions);
  const source = Object.values(snapshots)
    .map((snapshot) => `${snapshot.logicalKey}${IDENTITY_SEPARATOR}${snapshot.contentHash}`)
    .sort()
    .join('\n');

  return {
    algorithm: 'SHA-256',
    identityVersion: 1,
    fingerprint: await sha256Hex(source),
    questionCount: questions.length,
    generatedAt,
  };
}

export async function buildQuestionIdentitySnapshots(
  questions: readonly Question[],
): Promise<Record<string, QuestionIdentitySnapshot>> {
  const entries = await Promise.all(
    questions.map(async (question) => [
      question.id,
      {
        questionId: question.id,
        logicalKey: buildQuestionLogicalKey(question),
        contentHash: await buildQuestionContentHash(question),
      },
    ] as const),
  );

  return Object.fromEntries(entries);
}

export async function buildQuestionIdentityIndex(questions: readonly Question[]): Promise<QuestionIdentityIndex> {
  const snapshots = await Promise.all(
    questions.map(async (question) => ({
      questionId: question.id,
      logicalKey: buildQuestionLogicalKey(question),
      contentHash: await buildQuestionContentHash(question),
    })),
  );

  return snapshots.reduce<QuestionIdentityIndex>(
    (index, snapshot) => {
      addToIndex(index.byQuestionId, snapshot.questionId, snapshot);
      addToIndex(index.byLogicalKey, snapshot.logicalKey, snapshot);
      addToIndex(index.byContentHash, snapshot.contentHash, snapshot);
      addToIndex(index.byLogicalKeyAndContentHash, buildLogicalContentKey(snapshot.logicalKey, snapshot.contentHash), snapshot);
      return index;
    },
    {
      byQuestionId: new Map(),
      byLogicalKey: new Map(),
      byContentHash: new Map(),
      byLogicalKeyAndContentHash: new Map(),
    },
  );
}

export function buildLogicalContentKey(logicalKey: string, contentHash: string): string {
  return `${logicalKey}${IDENTITY_SEPARATOR}${contentHash}`;
}

export function buildQuestionLogicalKey(question: Question): string {
  return [
    normalizeIdentityText(question.year),
    normalizeIdentityText(question.subject),
    normalizeIdentityText(question.questionNumber),
    normalizeIdentityText(question.type),
  ].join(IDENTITY_SEPARATOR);
}

export async function buildQuestionContentHash(question: Question): Promise<string> {
  return sha256Hex(
    [
      normalizeIdentityText(question.stem),
      normalizeIdentityText(question.optionA ?? ''),
      normalizeIdentityText(question.optionB ?? ''),
      normalizeIdentityText(question.optionC ?? ''),
      normalizeIdentityText(question.optionD ?? ''),
      normalizeChoiceAnswer(question.correctAnswer).replace(/[()]/g, ''),
    ].join(IDENTITY_SEPARATOR),
  );
}

export function normalizeIdentityText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/^\ufeff/, '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function addToIndex(
  index: Map<string, QuestionIdentitySnapshot[]>,
  key: string,
  snapshot: QuestionIdentitySnapshot,
): void {
  index.set(key, [...(index.get(key) ?? []), snapshot]);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
