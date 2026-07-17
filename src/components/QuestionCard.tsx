import { getLearningThemeDisplayName } from '../services/displayDictionary';
import type { ChoiceExplanation } from '../types/ChoiceExplanation';
import type { ChoiceKey, PracticeAnswer, Question } from '../types/question';
import ChoiceButton from './ChoiceButton';
import ExplanationPanel from './ExplanationPanel';

interface QuestionCardProps {
  question: Question;
  answer?: PracticeAnswer;
  onSelectAnswer: (choice: ChoiceKey) => void;
  onNext: () => void;
  isLastQuestion: boolean;
  isAnswerSaving?: boolean;
  explanation?: ChoiceExplanation;
  isExplanationLoading?: boolean;
  onRequestExplanation: () => void;
  answerHeadline?: string;
}

const choices: Array<{ key: ChoiceKey; optionField: 'optionA' | 'optionB' | 'optionC' | 'optionD' }> = [
  { key: 'A', optionField: 'optionA' },
  { key: 'B', optionField: 'optionB' },
  { key: 'C', optionField: 'optionC' },
  { key: 'D', optionField: 'optionD' },
];

export default function QuestionCard({
  question,
  answer,
  onSelectAnswer,
  onNext,
  isLastQuestion,
  isAnswerSaving = false,
  explanation,
  isExplanationLoading = false,
  onRequestExplanation,
  answerHeadline,
}: QuestionCardProps) {
  const hasAnswered = Boolean(answer);
  const answerPanelClassName =
    answer?.isGradable === false
      ? 'answer-panel answer-panel--neutral'
      : answer?.isCorrect
        ? 'answer-panel answer-panel--correct'
        : 'answer-panel answer-panel--wrong';
  const feedbackHeadline =
    answer?.isGradable === false
      ? '本題未提供標準答案，本次作答不列入錯題紀錄。'
      : answerHeadline ?? (answer?.isCorrect ? '答案正確！' : `答案錯誤，正確答案是 ${answer?.correctAnswer}。`);

  return (
    <section className="question-card">
      <div className="question-meta">
        <span>{question.year}</span>
        <span>{question.subject}</span>
        <span>{getLearningThemeDisplayName(question.learningTheme)}</span>
        <span>{question.coreConcept ?? question.knowledgeNode}</span>
        <span>第 {question.questionNumber} 題</span>
      </div>

      <h1 className="question-stem">{question.stem}</h1>

      <div className="choice-list">
        {choices.map(({ key, optionField }) => {
          const text = question[optionField];

          if (!text) {
            return null;
          }

          return (
            <ChoiceButton
              key={key}
              choiceKey={key}
              text={text}
              disabled={hasAnswered || isAnswerSaving}
              isSelected={answer?.selectedAnswer === key}
              isCorrectAnswer={answer?.correctAnswer === key}
              hasAnswered={hasAnswered}
              onSelect={onSelectAnswer}
            />
          );
        })}
      </div>

      {answer ? (
        <div className={answerPanelClassName}>
          <strong>{feedbackHeadline}</strong>
          <p>我的答案：{answer.selectedAnswer}</p>
          <p>標準答案：{answer.isGradable === false ? '未提供' : answer.correctAnswer}</p>
          <button
            className="secondary-button"
            type="button"
            disabled={isExplanationLoading}
            onClick={onRequestExplanation}
          >
            {isExplanationLoading ? '讀取中...' : '細說分明'}
          </button>
          {explanation ? <ExplanationPanel explanation={explanation} /> : null}
          <button className="primary-button" type="button" onClick={onNext}>
            {isLastQuestion ? '查看結果' : '下一題'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
