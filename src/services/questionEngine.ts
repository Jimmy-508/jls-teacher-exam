import type { ChoiceKey, PracticeAnswer, Question } from '../types/question';
import { shuffle } from '../utils/shuffle';
import { isQuestionInLearningTheme } from './learningThemeService';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from './questionBankFields';

export type PracticeQuestionTypeFilter = 'all' | 'choice' | 'essay';
export type PracticeQuestionCount = number;

export function getChoiceQuestions(questions: readonly Question[]): Question[] {
  return questions.filter((question) => question.type === CHOICE_QUESTION_TYPE);
}

export function getEssayQuestions(questions: readonly Question[]): Question[] {
  return questions.filter((question) => question.type === ESSAY_QUESTION_TYPE);
}

export function getPracticeQuestionsByType(
  questions: readonly Question[],
  typeFilter: PracticeQuestionTypeFilter,
): Question[] {
  if (typeFilter === 'choice') {
    return getChoiceQuestions(questions);
  }

  if (typeFilter === 'essay') {
    return getEssayQuestions(questions);
  }

  return [...questions];
}

export function drawPracticeQuestions(
  questions: readonly Question[],
  typeFilter: PracticeQuestionTypeFilter = 'choice',
  questionCount: PracticeQuestionCount = 5,
): Question[] {
  return shuffle(getPracticeQuestionsByType(questions, typeFilter)).slice(0, questionCount);
}

export function drawPracticeQuestionsByKnowledgeNode(
  questions: readonly Question[],
  coreConceptName: string,
  typeFilter: PracticeQuestionTypeFilter = 'choice',
  questionCount: PracticeQuestionCount = 5,
): Question[] {
  return shuffle(
    getPracticeQuestionsByType(questions, typeFilter).filter(
      (question) => (question.coreConcept ?? question.knowledgeNode) === coreConceptName,
    ),
  ).slice(0, questionCount);
}

export function drawPracticeQuestionsByLearningTheme(
  questions: readonly Question[],
  learningThemeName: string,
  typeFilter: PracticeQuestionTypeFilter = 'choice',
  questionCount: PracticeQuestionCount = 5,
  subject?: string,
): Question[] {
  return shuffle(
    getPracticeQuestionsByType(questions, typeFilter).filter(
      (question) => isQuestionInLearningTheme(question, subject, learningThemeName),
    ),
  ).slice(0, questionCount);
}

export function drawPracticeQuestionsByIds(
  questions: readonly Question[],
  questionIds: readonly string[],
  typeFilter: PracticeQuestionTypeFilter = 'choice',
  questionCount: PracticeQuestionCount = 5,
): Question[] {
  const questionIdSet = new Set(questionIds);
  return shuffle(getPracticeQuestionsByType(questions, typeFilter).filter((question) => questionIdSet.has(question.id))).slice(
    0,
    questionCount,
  );
}

export function checkAnswer(question: Question, selectedAnswer: ChoiceKey): PracticeAnswer {
  const correctAnswer = question.correctAnswer.trim().toUpperCase();

  return {
    questionId: question.id,
    selectedAnswer,
    correctAnswer,
    isCorrect: selectedAnswer === correctAnswer,
  };
}

export function calculateAccuracy(correctCount: number, totalCount: number): number {
  if (totalCount === 0) {
    return 0;
  }

  return Math.round((correctCount / totalCount) * 100);
}
