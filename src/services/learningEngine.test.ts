import { describe, expect, it } from 'vitest';
import {
  calculateFamiliarity,
  calculateQuestionStatus,
  createLearningRecord,
  updateLearningRecord,
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
  });

  it('calculates question status', () => {
    expect(calculateQuestionStatus(undefined)).toBe('NeverSeen');
    expect(calculateQuestionStatus({ ...createLearningRecord('q1'), reviewCount: 1, familiarity: 4 })).toBe(
      'Mastered',
    );
  });
});
