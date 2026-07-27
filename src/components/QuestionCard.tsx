import type { ReactNode } from 'react';
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
  answerHeadline?: ReactNode;
}

const choices: Array<{
  key: ChoiceKey;
  optionField: 'optionA' | 'optionB' | 'optionC' | 'optionD';
  imageField: 'optionAImage' | 'optionBImage' | 'optionCImage' | 'optionDImage';
}> = [
  { key: 'A', optionField: 'optionA', imageField: 'optionAImage' },
  { key: 'B', optionField: 'optionB', imageField: 'optionBImage' },
  { key: 'C', optionField: 'optionC', imageField: 'optionCImage' },
  { key: 'D', optionField: 'optionD', imageField: 'optionDImage' },
];

function hasImageValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

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
  const hasStemImage = hasImageValue(question.stemImage);
  const hasImageNote = hasImageValue(question.imageNote);

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
      {hasStemImage ? (
        <img className="question-image question-stem-image" src={question.stemImage} alt="Question image" />
      ) : null}

      <div className="choice-list">
        {choices.map(({ key, optionField, imageField }) => {
          const text = question[optionField];
          const imageSrc = question[imageField];

          if (!text) {
            return null;
          }

          return (
            <ChoiceButton
              key={key}
              choiceKey={key}
              text={text}
              imageSrc={hasImageValue(imageSrc) ? imageSrc : undefined}
              imageAlt={key + ' option image'}
              disabled={hasAnswered || isAnswerSaving}
              isSelected={answer?.selectedAnswer === key}
              isCorrectAnswer={answer?.correctAnswer === key}
              hasAnswered={hasAnswered}
              onSelect={onSelectAnswer}
            />
          );
        })}
      </div>

      {hasImageNote ? <p className="question-image-note">{question.imageNote}</p> : null}

      {answer ? (
        <div className={answerPanelClassName}>
          <strong className="answer-panel__headline">{feedbackHeadline}</strong>
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
