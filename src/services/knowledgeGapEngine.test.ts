import { describe, expect, it } from 'vitest';
import { createProvider } from '../ai/AIProviderFactory';
import {
  MockAIProvider,
  calculateCoverage,
  calculateRating,
  calculateTextSimilarity,
  normalizeText,
} from '../ai/providers/MockAIProvider';
import type { AIProvider } from '../ai/AIProvider';
import { KnowledgeGapEngine, analyzeAnswer } from './knowledgeGapEngine';
import { extractRubricFromQuestion } from './rubricService';
import { ANSWER_ANALYSIS_UI_TERMS } from '../components/AnswerAnalysisPanel';
import type { Question } from '../types/question';

describe('knowledgeGapEngine', () => {
  it('factory returns Mock provider', async () => {
    await expect(createProvider('mock')).resolves.toBeInstanceOf(MockAIProvider);
  });

  it('KnowledgeGapEngine uses injected provider', async () => {
    const provider: AIProvider = {
      async analyzeEssay(input) {
        return {
          questionId: input.questionId,
          score: 7,
          maxScore: 10,
          rating: 4,
          mastered: ['Injected'],
          suggestedAdditions: [],
          knowledgeCoverageRate: 100,
          summary: 'Injected provider result.',
          referenceAnswer: input.referenceAnswer,
          provider: 'manual',
          createdAt: '2026-07-06T00:00:00.000Z',
        };
      },
    };
    const engine = new KnowledgeGapEngine(provider);
    const result = await engine.analyzeAnswer(createInput());

    expect(result.mastered).toEqual(['Injected']);
    expect(result.provider).toBe('manual');
  });

  it('KnowledgeGapEngine can use an OpenAI provider result', async () => {
    const provider: AIProvider = {
      analyzeEssay: async () => ({
        questionId: 'EA001',
        score: 22,
        maxScore: 25,
        rating: 5,
        mastered: ['OpenAI mastered'],
        suggestedAdditions: [],
        knowledgeCoverageRate: 88,
        summary: 'OpenAI provider result.',
        referenceAnswer: 'reference',
        provider: 'openai',
        createdAt: '2026-07-07T00:00:00.000Z',
      }),
    };
    const engine = new KnowledgeGapEngine(provider);

    const result = await engine.analyzeAnswer(createInput());

    expect(result.provider).toBe('openai');
    expect(result.summary).toBe('OpenAI provider result.');
  });

  it('Mock provider returns AnswerAnalysisResult', async () => {
    const result = await new MockAIProvider().analyzeEssay(createInput());

    expect(result.provider).toBe('mock');
    expect(result.questionId).toBe('EA001');
    expect(result.mastered.length).toBeGreaterThan(0);
  });

  it('returns full coverage when userAnswer exactly matches referenceAnswer', async () => {
    const referenceAnswer = '形成性評量用於掌握學習狀態、調整教學策略，並提供即時回饋。';
    const result = await new MockAIProvider().analyzeEssay({
      questionId: 'EA001',
      questionText: '請說明形成性評量的用途。',
      learningTheme: '評量',
      knowledgeNode: '形成性評量',
      userAnswer: referenceAnswer,
      referenceAnswer,
      rubric: ['掌握學習狀態', '調整教學策略', '即時回饋'],
      maxScore: 25,
    });

    expect(result.knowledgeCoverageRate).toBe(100);
    expect(result.score).toBe(result.maxScore);
    expect(result.rating).toBe(5);
    expect(result.mastered).toEqual(['掌握學習狀態', '調整教學策略', '即時回饋']);
    expect(result.suggestedAdditions).toEqual([]);
  });

  it('returns full coverage when userAnswer differs only by punctuation and whitespace', async () => {
    const result = await new MockAIProvider().analyzeEssay({
      questionId: 'EA001',
      questionText: '請說明形成性評量的用途。',
      learningTheme: '評量',
      knowledgeNode: '形成性評量',
      userAnswer: '形成性評量 用於掌握學習狀態\n調整教學策略 並提供即時回饋',
      referenceAnswer: '形成性評量用於掌握學習狀態、調整教學策略，並提供即時回饋。',
      rubric: ['掌握學習狀態', '調整教學策略', '即時回饋'],
      maxScore: 25,
    });

    expect(result.knowledgeCoverageRate).toBe(100);
    expect(result.score).toBe(result.maxScore);
    expect(result.suggestedAdditions).toEqual([]);
  });

  it('normalizes punctuation, whitespace, line breaks, and case', () => {
    expect(normalizeText('ABC，\n ｄｅｆ。')).toBe('abcdef');
  });

  it('calculates high similarity for near-identical normalized text', () => {
    expect(calculateTextSimilarity('形成性評量用於掌握學習狀態並提供即時回饋', '形成性評量用於掌握學習狀態，並提供即時回饋。')).toBeGreaterThanOrEqual(0.9);
  });

  it('Provider interface compiles', async () => {
    const provider: AIProvider = await createProvider('mock');
    const result = await provider.analyzeEssay(createInput());

    expect(result).toEqual(expect.objectContaining({ provider: 'mock' }));
  });

  it('calculateCoverage returns correct percentage', () => {
    expect(calculateCoverage(['形成性評量', '信度'], ['形成性評量', '信度', '效度', '常模'])).toBe(50);
  });

  it('calculateRating returns 1-5 correctly', () => {
    expect(calculateRating(0, 25)).toBe(1);
    expect(calculateRating(5, 25)).toBe(1);
    expect(calculateRating(6, 25)).toBe(2);
    expect(calculateRating(25, 25)).toBe(5);
  });

  it('analyzeAnswer detects mastered rubric items', async () => {
    const result = await analyzeAnswer({
      questionId: 'EA001',
      questionText: '請說明形成性評量。',
      learningTheme: '教學評量',
      knowledgeNode: '形成性評量',
      userAnswer: '形成性評量可以掌握學習狀態並提供即時回饋。',
      referenceAnswer: '形成性評量用於掌握學習狀態、調整教學策略，並提供即時回饋。',
      rubric: ['掌握學習狀態', '調整教學策略', '即時回饋'],
      maxScore: 25,
    });

    expect(result.mastered).toEqual(['掌握學習狀態', '即時回饋']);
  });

  it('analyzeAnswer detects suggestedAdditions', async () => {
    const result = await analyzeAnswer({
      questionId: 'EA001',
      questionText: '請說明形成性評量。',
      learningTheme: '教學評量',
      knowledgeNode: '形成性評量',
      userAnswer: '形成性評量可以掌握學習狀態。',
      referenceAnswer: '形成性評量用於掌握學習狀態、調整教學策略，並提供即時回饋。',
      rubric: ['掌握學習狀態', '調整教學策略', '即時回饋'],
      maxScore: 25,
    });

    expect(result.suggestedAdditions).toEqual(['調整教學策略', '即時回饋']);
  });

  it('rubricService extracts rubric from note', () => {
    const question = createQuestion({
      note: '掌握學習狀態|調整教學策略,即時回饋；促進學習',
      knowledgeNode: '形成性評量',
      learningTheme: '教學評量',
    });

    expect(extractRubricFromQuestion(question)).toEqual(['掌握學習狀態', '調整教學策略', '即時回饋', '促進學習']);
  });

  it('AnswerAnalysisResult contains no missing required fields', async () => {
    const result = await analyzeAnswer({
      questionId: 'EA001',
      questionText: '請說明形成性評量。',
      learningTheme: '教學評量',
      knowledgeNode: '形成性評量',
      userAnswer: '形成性評量可以掌握學習狀態。',
      referenceAnswer: '形成性評量用於掌握學習狀態。',
      rubric: ['掌握學習狀態'],
      maxScore: 25,
    });

    expect(result).toEqual(
      expect.objectContaining({
        questionId: expect.any(String),
        score: expect.any(Number),
        maxScore: expect.any(Number),
        rating: expect.any(Number),
        mastered: expect.any(Array),
        suggestedAdditions: expect.any(Array),
        knowledgeCoverageRate: expect.any(Number),
        summary: expect.any(String),
        referenceAnswer: expect.any(String),
        provider: 'mock',
        createdAt: expect.any(String),
      }),
    );
  });

  it('UI terminology does not include banned labels', () => {
    const terms = Object.values(ANSWER_ANALYSIS_UI_TERMS).join(' ');

    expect(terms).not.toContain('知識覆蓋');
    expect(terms).not.toContain('知識覆蓋率');
    expect(terms).not.toContain('可再提升');
    expect(terms).not.toContain('AI Feedback');
    expect(terms).not.toContain('Essay Result');
    expect(terms).not.toContain('分數');
  });
});

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'EA001',
    year: '113',
    category: '國小',
    subject: '教育評量',
    questionNumber: '1',
    type: '非選題',
    score: 25,
    group: '教學評量',
    learningTheme: '教學評量',
    knowledgeNode: '形成性評量',
    stem: '請說明形成性評量。',
    correctAnswer: '形成性評量用於掌握學習狀態。',
    ...overrides,
  };
}

function createInput() {
  return {
    questionId: 'EA001',
    questionText: '請說明形成性評量。',
    learningTheme: '教學評量',
    knowledgeNode: '形成性評量',
    userAnswer: '形成性評量可以掌握學習狀態。',
    referenceAnswer: '形成性評量用於掌握學習狀態。',
    rubric: ['掌握學習狀態'],
    maxScore: 25,
  };
}
