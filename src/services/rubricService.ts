import type { Question } from '../types/question';

const RUBRIC_SEPARATORS = /[|、,，;；\n\r]+/;

export function extractRubricFromQuestion(question: Question): string[] {
  const noteItems = splitRubricItems(question.note ?? '');

  if (noteItems.length > 0) {
    return noteItems;
  }

  if (question.knowledgeNode.trim().length > 0) {
    return [question.knowledgeNode.trim()];
  }

  if (question.learningTheme.trim().length > 0) {
    return [question.learningTheme.trim()];
  }

  return [];
}

function splitRubricItems(value: string): string[] {
  return Array.from(new Set(value.split(RUBRIC_SEPARATORS).map((item) => item.trim()).filter(Boolean)));
}

