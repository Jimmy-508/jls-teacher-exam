import type { LearningProfile } from '../types/LearningProfile';
import type { LearningRecord } from '../types/LearningRecord';
import type { AnswerAnalysisResult } from '../types/AnswerAnalysisResult';
import type { PracticeAnswer, Question } from '../types/question';
import type { PracticeSession } from '../types/PracticeSession';
import type { QuestionStatus } from '../types/QuestionStatus';

export const LEARNING_RECORDS_STORAGE_KEY = 'jtep.learningRecords.v1';
export const LEARNING_PROFILE_STORAGE_KEY = 'jtep.learningProfile.v1';
export const ACTIVE_PRACTICE_SESSION_STORAGE_KEY = 'jtep.activePracticeSession.v1';
export const LAST_PRACTICE_SESSION_STORAGE_KEY = 'jtep.lastPracticeSession.v1';

const MIN_FAMILIARITY = 0;
const MAX_FAMILIARITY = 4;

export interface AnswerAnalysisLearningRecordUpdate {
  mastered: string[];
  suggestedAdditions: string[];
  knowledgeCoverageRate: number;
}

export function createLearningRecord(questionId: string): LearningRecord {
  const now = new Date().toISOString();

  return {
    id: questionId,
    learningTheme: '',
    knowledgeNode: '',
    mastery: 0,
    masteredCount: 0,
    missingCount: 0,
    recentMissing: [],
    updatedAt: now,
    questionId,
    lastCorrect: false,
    correctCount: 0,
    wrongCount: 0,
    familiarity: 0,
    reviewCount: 0,
    firstSeen: now,
    lastSeen: now,
    viewedAI: false,
  };
}

export function calculateFamiliarity(currentFamiliarity: number, isCorrect: boolean): number {
  const nextFamiliarity = isCorrect ? currentFamiliarity + 1 : currentFamiliarity - 1;
  return Math.min(MAX_FAMILIARITY, Math.max(MIN_FAMILIARITY, nextFamiliarity));
}

export function calculateQuestionStatus(record?: LearningRecord): QuestionStatus {
  if (!record || record.reviewCount === 0) {
    return 'NeverSeen';
  }

  if (record.familiarity >= MAX_FAMILIARITY) {
    return 'Mastered';
  }

  if (record.wrongCount > 0 && record.lastCorrect) {
    return 'Review';
  }

  return 'Learning';
}

export function updateLearningRecord(record: LearningRecord | undefined, answer: PracticeAnswer): LearningRecord {
  const currentRecord = record ?? createLearningRecord(answer.questionId);
  const now = new Date().toISOString();

  return {
    ...currentRecord,
    lastAnswer: answer.selectedAnswer,
    lastCorrect: answer.isCorrect,
    correctCount: currentRecord.correctCount + (answer.isCorrect ? 1 : 0),
    wrongCount: currentRecord.wrongCount + (answer.isCorrect ? 0 : 1),
    familiarity: calculateFamiliarity(currentRecord.familiarity, answer.isCorrect),
    reviewCount: currentRecord.reviewCount + 1,
    firstSeen: currentRecord.firstSeen ?? now,
    lastSeen: now,
    lastReview: now,
  };
}

export function createPracticeSession(questionIds: string[]): PracticeSession {
  const now = new Date().toISOString();

  return {
    id: `practice-${Date.now()}`,
    startTime: now,
    totalQuestions: questionIds.length,
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    durationSeconds: 0,
    questionType: '選擇題',
    questionIds,
    currentIndex: 0,
    answers: [],
    status: 'active',
  };
}

export function restoreSessionQuestions(session: PracticeSession, allQuestions: readonly Question[]): Question[] {
  const questionsById = new Map(allQuestions.map((question) => [question.id, question]));

  return session.questionIds.flatMap((questionId) => {
    const question = questionsById.get(questionId);
    return question ? [question] : [];
  });
}

export function canRestorePracticeSession(
  session: PracticeSession | null,
  allQuestions: readonly Question[],
): session is PracticeSession {
  if (!session || session.status !== 'active' || session.questionIds.length === 0) {
    return false;
  }

  return restoreSessionQuestions(session, allQuestions).length === session.questionIds.length;
}

export function ensureLearningRecords(
  records: Record<string, LearningRecord>,
  questions: readonly Question[],
): Record<string, LearningRecord> {
  return questions.reduce<Record<string, LearningRecord>>(
    (nextRecords, question) => ({
      ...nextRecords,
      [question.id]: nextRecords[question.id] ?? createLearningRecord(question.id),
    }),
    { ...records },
  );
}

export function updatePracticeSessionAnswer(session: PracticeSession, answer: PracticeAnswer): PracticeSession {
  const answers = [...session.answers.filter((item) => item.questionId !== answer.questionId), answer];
  const correctCount = answers.filter((item) => item.isCorrect).length;
  const wrongCount = answers.length - correctCount;
  const isCompleted = answers.length >= session.totalQuestions;
  const endTime = isCompleted ? new Date().toISOString() : session.endTime;

  return {
    ...session,
    answers,
    correctCount,
    wrongCount,
    accuracy: session.totalQuestions > 0 ? Math.round((correctCount / session.totalQuestions) * 100) : 0,
    durationSeconds: calculateDurationSeconds(session.startTime, endTime ?? new Date().toISOString()),
    endTime,
    status: isCompleted ? 'completed' : 'active',
  };
}

export function updatePracticeSessionCurrentIndex(session: PracticeSession, currentIndex: number): PracticeSession {
  return {
    ...session,
    currentIndex,
    durationSeconds: calculateDurationSeconds(session.startTime, new Date().toISOString()),
  };
}

export function calculateLearningProfile(records: readonly LearningRecord[], recentPracticeDate?: string): LearningProfile {
  const totalCorrect = records.reduce((sum, record) => sum + record.correctCount, 0);
  const totalWrong = records.reduce((sum, record) => sum + record.wrongCount, 0);
  const totalFamiliarity = records.reduce((sum, record) => sum + record.familiarity, 0);

  return {
    totalAnswers: totalCorrect + totalWrong,
    totalCorrect,
    totalWrong,
    averageFamiliarity: records.length > 0 ? Number((totalFamiliarity / records.length).toFixed(2)) : 0,
    currentWrongQuestions: records.filter((record) => record.wrongCount > record.correctCount).length,
    recentPracticeDate,
  };
}

export function applyAnswerAnalysisToLearningRecord(
  result: AnswerAnalysisResult,
): AnswerAnalysisLearningRecordUpdate {
  return {
    mastered: result.mastered,
    suggestedAdditions: result.suggestedAdditions,
    knowledgeCoverageRate: result.knowledgeCoverageRate,
  };
}

function calculateDurationSeconds(startTime: string, endTime: string): number {
  const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(0, Math.round(durationMs / 1000));
}
