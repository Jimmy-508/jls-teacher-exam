import type { ChoiceExplanation } from '../types/ChoiceExplanation';
import type { ChoiceKey, Question } from '../types/question';

export function buildOfflineChoiceExplanation(question: Question, userAnswer: ChoiceKey): ChoiceExplanation {
  return {
    questionId: question.id,
    questionKeyPoint: question.stemAnalysis ?? '',
    optionAnalysis: {
      A: formatOptionAnalysis('A', question.optionAAnalysis),
      B: formatOptionAnalysis('B', question.optionBAnalysis),
      C: formatOptionAnalysis('C', question.optionCAnalysis),
      D: formatOptionAnalysis('D', question.optionDAnalysis),
    },
    learningFeedback: '',
    extendedLearning: {
      relatedKnowledgeNodes: [question.coreConcept ?? question.knowledgeNode].filter(isPresent),
      confusingConcepts: [question.confusingConcepts].filter(isPresent),
      relatedExamPoints: [question.learningTheme].filter(isPresent),
    },
    solvingTechnique: question.solvingTechnique ?? '',
    confusingConcepts: question.confusingConcepts ?? '',
    userAnswer,
    provider: 'offline',
    createdAt: new Date().toISOString(),
  };
}

function formatOptionAnalysis(choice: ChoiceKey, analysis: string | undefined): string {
  return analysis ? `${choice} 選項\n${analysis}` : '';
}

function isPresent(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}
