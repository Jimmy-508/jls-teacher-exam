import type { ChoiceKey } from '../types/question';

interface ChoiceButtonProps {
  choiceKey: ChoiceKey;
  text: string;
  disabled: boolean;
  isSelected: boolean;
  isCorrectAnswer: boolean;
  hasAnswered: boolean;
  onSelect: (choice: ChoiceKey) => void;
}

export default function ChoiceButton({
  choiceKey,
  text,
  disabled,
  isSelected,
  isCorrectAnswer,
  hasAnswered,
  onSelect,
}: ChoiceButtonProps) {
  const stateClass = [
    'choice-button',
    hasAnswered && isCorrectAnswer ? 'choice-button--correct' : '',
    hasAnswered && isSelected && !isCorrectAnswer ? 'choice-button--wrong' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={stateClass} type="button" disabled={disabled} onClick={() => onSelect(choiceKey)}>
      <span className="choice-button__key">{choiceKey}</span>
      <span className="choice-button__text">{text}</span>
    </button>
  );
}
