import { describe, expect, it } from 'vitest';
import { calculateAverageFeedbackLevel, toStars } from './feedbackLevel';

describe('feedbackLevel', () => {
  it('rounds average feedback levels into star levels', () => {
    expect(calculateAverageFeedbackLevel([4, 2])).toBe(3);
    expect(calculateAverageFeedbackLevel([4, 5])).toBe(5);
    expect(calculateAverageFeedbackLevel([3, 4])).toBe(4);
    expect(calculateAverageFeedbackLevel([1, 2, 2])).toBe(2);
  });

  it('returns null when there are no feedback levels', () => {
    expect(calculateAverageFeedbackLevel([])).toBeNull();
  });

  it('clamps average feedback levels between 1 and 5', () => {
    expect(calculateAverageFeedbackLevel([0])).toBe(1);
    expect(calculateAverageFeedbackLevel([6])).toBe(5);
  });

  it('renders star text from a feedback level', () => {
    expect(toStars(3)).toBe('★★★☆☆');
  });
});
