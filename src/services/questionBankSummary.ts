import type { Question } from '../types/question';
import type { QuestionBankSummary } from '../types/QuestionBankSummary';
import { getLearningThemeDisplayName } from './displayDictionary';

export function buildQuestionBankSummary(questions: readonly Question[]): QuestionBankSummary {
  const byYear = countBy(questions, (question) => question.year);
  const bySubject = countBy(questions, (question) => question.subject);
  const byLearningTheme = countBy(questions, (question) => getLearningThemeDisplayName(question.learningTheme || question.group));
  const byCoreConcept = countBy(questions, (question) => question.coreConcept ?? question.knowledgeNode);
  const byQuestionType = countBy(questions, (question) => question.type);
  const singletonCoreConcepts = Object.entries(byCoreConcept)
    .filter(([, count]) => count === 1)
    .map(([name]) => name);

  return {
    totalQuestions: questions.length,
    byYear,
    bySubject,
    byLearningTheme,
    byCoreConcept,
    byKnowledgeNode: byCoreConcept,
    byQuestionType,
    singletonCoreConcepts,
    singletonKnowledgeNodes: singletonCoreConcepts,
    smallLearningThemes: Object.entries(byLearningTheme)
      .filter(([, count]) => count < 3)
      .map(([name]) => name),
  };
}

function countBy(questions: readonly Question[], getKey: (question: Question) => string): Record<string, number> {
  return questions.reduce<Record<string, number>>((counts, question) => {
    const key = getKey(question).trim() || '未分類';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
