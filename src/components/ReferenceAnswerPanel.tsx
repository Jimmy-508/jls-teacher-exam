import { useEffect, useState } from 'react';

interface ReferenceAnswerPanelProps {
  referenceAnswer?: string;
  questionId: string;
}

export default function ReferenceAnswerPanel({ questionId, referenceAnswer }: ReferenceAnswerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [questionId]);

  if (!referenceAnswer?.trim()) {
    return null;
  }

  return (
    <details className="reference-answer-panel" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>參考答案</summary>
      <p>{referenceAnswer}</p>
    </details>
  );
}
