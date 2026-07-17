import { describe, expect, it, vi } from 'vitest';
import {
  checkAnswer,
  drawPracticeQuestions,
  drawPracticeQuestionsByIds,
  drawPracticeQuestionsByKnowledgeNode,
  drawPracticeQuestionsByLearningTheme,
  getChoiceQuestions,
  getEssayQuestions,
  getPracticeQuestionsByType,
  normalizeChoiceKey,
} from './questionEngine';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from './questionBankFields';
import type { Question } from '../types/question';

const questions: Question[] = [
  createQuestion('q1', '形成性評量', CHOICE_QUESTION_TYPE, 'A'),
  createQuestion('q2', '形成性評量', CHOICE_QUESTION_TYPE, 'B'),
  createQuestion('q3', '班級經營', ESSAY_QUESTION_TYPE, 'C'),
  createQuestion('q4', '班級經營', CHOICE_QUESTION_TYPE, 'D'),
  createQuestion('q5', '班級經營', CHOICE_QUESTION_TYPE, 'A'),
  createQuestion('q6', '班級經營', CHOICE_QUESTION_TYPE, 'B'),
];

describe('questionEngine', () => {
  it('filters choice questions only', () => {
    expect(getChoiceQuestions(questions).map((question) => question.id)).toEqual(['q1', 'q2', 'q4', 'q5', 'q6']);
  });

  it('filters essay questions only', () => {
    expect(getEssayQuestions(questions).map((question) => question.id)).toEqual(['q3']);
  });

  it('supports Practice question type switching', () => {
    expect(getPracticeQuestionsByType(questions, 'all').map((question) => question.id)).toEqual([
      'q1',
      'q2',
      'q3',
      'q4',
      'q5',
      'q6',
    ]);
    expect(getPracticeQuestionsByType(questions, 'choice').map((question) => question.id)).toEqual([
      'q1',
      'q2',
      'q4',
      'q5',
      'q6',
    ]);
    expect(getPracticeQuestionsByType(questions, 'essay').map((question) => question.id)).toEqual(['q3']);
  });

  it('supports Practice question count switching', () => {
    expect(drawPracticeQuestions(questions, 'all', 5)).toHaveLength(5);
    expect(drawPracticeQuestions(questions, 'all', 10)).toHaveLength(6);
  });

  it('does not force all mode to include both choice and essay questions', () => {
    const choiceOnlyQuestions = questions.filter((question) => question.type === CHOICE_QUESTION_TYPE);

    expect(drawPracticeQuestions(choiceOnlyQuestions, 'all', 5).every((question) => question.type === CHOICE_QUESTION_TYPE)).toBe(
      true,
    );
  });

  it('checks answer correctness', () => {
    expect(checkAnswer(questions[0], 'A').isCorrect).toBe(true);
    expect(checkAnswer(questions[0], 'B').isCorrect).toBe(false);
  });

  it('normalizes standard answer keys from common CSV formats', () => {
    expect(normalizeChoiceKey('A')).toBe('A');
    expect(normalizeChoiceKey('(b)')).toBe('B');
    expect(normalizeChoiceKey('（Ｃ）')).toBe('C');
    expect(normalizeChoiceKey(' Ｄ ')).toBe('D');
    expect(normalizeChoiceKey('')).toBeNull();
    expect(normalizeChoiceKey('未提供')).toBeNull();
    expect(normalizeChoiceKey('E')).toBeNull();
  });

  it('marks choice answers without a valid standard answer as ungradable', () => {
    const answer = checkAnswer(createQuestion('q-ungraded', 'node', CHOICE_QUESTION_TYPE, ''), 'A');

    expect(answer).toEqual({
      questionId: 'q-ungraded',
      selectedAnswer: 'A',
      correctAnswer: '',
      isCorrect: false,
      isGradable: false,
    });
  });

  it('draws questions by knowledge node', () => {
    const drawnQuestions = drawPracticeQuestionsByKnowledgeNode(questions, '形成性評量', 'all');
    expect(drawnQuestions).toHaveLength(2);
    expect(drawnQuestions.every((question) => question.knowledgeNode === '形成性評量')).toBe(true);
  });

  it('draws questions by learning theme', () => {
    const drawnQuestions = drawPracticeQuestionsByLearningTheme(questions, '教學評量', 'all', 10);
    expect(drawnQuestions).toHaveLength(6);
    expect(drawnQuestions.every((question) => question.learningTheme === '教學評量')).toBe(true);
  });

  it('draws questions by displayed learning theme aliases', () => {
    const aliasQuestions = [createQuestion('q7', '教育目的', CHOICE_QUESTION_TYPE, 'A', '教原')];
    const drawnQuestions = drawPracticeQuestionsByLearningTheme(aliasQuestions, '教育原理與制度', 'all', 5);

    expect(drawnQuestions.map((question) => question.id)).toEqual(['q7']);
  });

  it('draws questions only from the provided questionIds scope', () => {
    const drawnQuestions = drawPracticeQuestionsByIds(questions, ['q1', 'q3', 'q5'], 'all', 10);

    expect(drawnQuestions.map((question) => question.id).sort()).toEqual(['q1', 'q3', 'q5']);
  });

  it('keeps type switching within the provided questionIds scope', () => {
    const scopedIds = ['q1', 'q3', 'q4'];

    expect(drawPracticeQuestionsByIds(questions, scopedIds, 'choice', 10).map((question) => question.id).sort()).toEqual([
      'q1',
      'q4',
    ]);
    expect(drawPracticeQuestionsByIds(questions, scopedIds, 'essay', 10).map((question) => question.id)).toEqual(['q3']);
  });

  it('does not draw more than questionCount from questionIds', () => {
    expect(drawPracticeQuestionsByIds(questions, ['q1', 'q2', 'q4', 'q5'], 'choice', 2)).toHaveLength(2);
  });

  it('shuffles questionIds results instead of relying on fixed question bank order', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    try {
      const drawnIds = drawPracticeQuestionsByIds(questions, ['q1', 'q2', 'q4', 'q5'], 'choice', 2).map(
        (question) => question.id,
      );

      expect(drawnIds).not.toEqual(['q1', 'q2']);
      expect(drawnIds.every((questionId) => ['q1', 'q2', 'q4', 'q5'].includes(questionId))).toBe(true);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('draws learning theme questions by the same subject and fallback theme logic as Knowledge', () => {
    const themeQuestions = [
      {
        ...createQuestion('q8', '性別教育', CHOICE_QUESTION_TYPE, 'A', ''),
        group: ' 性別教育 ',
        subject: '教育理念與實務',
      },
      {
        ...createQuestion('q9', '性別教育', CHOICE_QUESTION_TYPE, 'A', '性別教育'),
        subject: '課程教學與評量',
      },
    ];

    const drawnQuestions = drawPracticeQuestionsByLearningTheme(themeQuestions, '性別教育', 'choice', 5, '教育理念與實務');

    expect(drawnQuestions.map((question) => question.id)).toEqual(['q8']);
  });
});

function createQuestion(
  id: string,
  knowledgeNode: string,
  type: Question['type'],
  correctAnswer: string,
  learningTheme = '教學評量',
): Question {
  return {
    id,
    year: '113',
    category: '國小',
    subject: '教育原理',
    questionNumber: id,
    type,
    score: 2,
    group: learningTheme,
    learningTheme,
    knowledgeNode,
    stem: '題幹',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer,
  };
}
