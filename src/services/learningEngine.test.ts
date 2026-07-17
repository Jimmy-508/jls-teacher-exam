import { describe, expect, it } from 'vitest';
import {
  calculateFamiliarity,
  calculateQuestionStatus,
  createPracticeSession,
  createLearningRecord,
  updateLearningRecord,
  updatePracticeSessionAnswer,
} from './learningEngine';
import type { PracticeAnswer } from '../types/question';

describe('learningEngine', () => {
  it('keeps familiarity inside 0 to 4', () => {
    expect(calculateFamiliarity(0, false)).toBe(0);
    expect(calculateFamiliarity(4, true)).toBe(4);
    expect(calculateFamiliarity(2, true)).toBe(3);
    expect(calculateFamiliarity(2, false)).toBe(1);
  });

  it('updates learning record after answering', () => {
    const answer: PracticeAnswer = {
      questionId: 'q1',
      selectedAnswer: 'A',
      correctAnswer: 'A',
      isCorrect: true,
    };
    const record = updateLearningRecord(createLearningRecord('q1'), answer);

    expect(record.correctCount).toBe(1);
    expect(record.wrongCount).toBe(0);
    expect(record.familiarity).toBe(1);
    expect(record.reviewCount).toBe(1);
    expect(record.attempts).toEqual([
      expect.objectContaining({
        selectedAnswer: 'A',
        isCorrect: true,
      }),
    ]);
  });

  it('keeps recent attempt history after multiple answers', () => {
    const firstRecord = updateLearningRecord(createLearningRecord('q1'), {
      questionId: 'q1',
      selectedAnswer: 'A',
      correctAnswer: 'B',
      isCorrect: false,
    });
    const secondRecord = updateLearningRecord(firstRecord, {
      questionId: 'q1',
      selectedAnswer: 'B',
      correctAnswer: 'B',
      isCorrect: true,
    });

    expect(secondRecord.attempts?.map((attempt) => attempt.selectedAnswer)).toEqual(['A', 'B']);
    expect(secondRecord.attempts?.map((attempt) => attempt.isCorrect)).toEqual([false, true]);
  });

  it('records ungradable answers without changing score or wrong counters', () => {
    const previousRecord = {
      ...createLearningRecord('q1'),
      correctCount: 2,
      wrongCount: 3,
      familiarity: 2,
      lastCorrect: true,
      reviewCount: 5,
    };

    const record = updateLearningRecord(previousRecord, {
      questionId: 'q1',
      selectedAnswer: 'A',
      correctAnswer: '',
      isCorrect: false,
      isGradable: false,
    });

    expect(record.correctCount).toBe(2);
    expect(record.wrongCount).toBe(3);
    expect(record.familiarity).toBe(2);
    expect(record.lastCorrect).toBe(true);
    expect(record.reviewCount).toBe(6);
    expect(record.lastAnswer).toBe('A');
    expect(record.attempts?.[record.attempts.length - 1]).toEqual(
      expect.objectContaining({
        selectedAnswer: 'A',
        isCorrect: false,
        isGradable: false,
      }),
    );
  });

  it('excludes ungradable answers from practice session scoring', () => {
    const session = createPracticeSession(['q1']);
    const updatedSession = updatePracticeSessionAnswer(session, {
      questionId: 'q1',
      selectedAnswer: 'A',
      correctAnswer: '',
      isCorrect: false,
      isGradable: false,
    });

    expect(updatedSession.correctCount).toBe(0);
    expect(updatedSession.wrongCount).toBe(0);
    expect(updatedSession.accuracy).toBe(0);
    expect(updatedSession.status).toBe('completed');
    expect(updatedSession.answers[0].isGradable).toBe(false);
  });

  it('calculates question status', () => {
    expect(calculateQuestionStatus(undefined)).toBe('NeverSeen');
    expect(calculateQuestionStatus({ ...createLearningRecord('q1'), reviewCount: 1, familiarity: 4 })).toBe(
      'Mastered',
    );
  });
});
