import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { CHOICE_QUESTION_TYPE } from '../services/questionBankFields';
import type { PracticeAnswer, Question } from '../types/question';
import QuestionCard from './QuestionCard';

describe('QuestionCard', () => {
  it('uses the default correct and wrong answer headlines in normal practice', () => {
    expect(renderQuestionCard({ isCorrect: true })).toContain('答案正確！');
    expect(renderQuestionCard({ isCorrect: false })).toContain('答案錯誤，正確答案是 B。');
  });

  it('can show a custom feedback headline in the answer panel', () => {
    const html = renderQuestionCard(
      { isCorrect: true },
      '答對了！這一題已從錯題本移除，目前剩11題待消除。',
    );

    expect(html).toContain('答對了！這一題已從錯題本移除，目前剩11題待消除。');
    expect(html).not.toContain('答案正確！');
  });

  it('can show wrong elimination success as two controlled lines', () => {
    const html = renderQuestionCard(
      { isCorrect: true },
      <span className="elimination-feedback">
        <span className="elimination-feedback__line">答對了！這一題已從錯題本移除。</span>
        <span className="elimination-feedback__line">目前剩11題待消除。</span>
      </span>,
    );

    expect(html).toContain('答對了！這一題已從錯題本移除。');
    expect(html).toContain('目前剩11題待消除。');
    expect(html.match(/elimination-feedback__line/g)).toHaveLength(2);
    expect(html).not.toContain('答案正確！');
  });

  it('can show wrong elimination failure as two controlled lines', () => {
    const html = renderQuestionCard(
      { isCorrect: false },
      <span className="elimination-feedback">
        <span className="elimination-feedback__line">這一題仍未答對…</span>
        <span className="elimination-feedback__line">會保留在待消除的錯題中。</span>
      </span>,
    );

    expect(html).toContain('這一題仍未答對…');
    expect(html).toContain('會保留在待消除的錯題中。');
    expect(html.match(/elimination-feedback__line/g)).toHaveLength(2);
    expect(html).not.toContain('答案錯誤，正確答案是 B。');
  });

  it('shows a neutral message when a choice question has no valid standard answer', () => {
    const html = renderQuestionCard({
      correctAnswer: '',
      isCorrect: false,
      isGradable: false,
    });

    expect(html).toContain('本題未提供標準答案，本次作答不列入錯題紀錄。');
    expect(html).toContain('標準答案：未提供');
    expect(html).toContain('answer-panel answer-panel--neutral');
    expect(html).not.toContain('answer-panel answer-panel--wrong');
    expect(html).not.toContain('answer-panel answer-panel--correct');
  });
});

function renderQuestionCard(answerOverrides: Partial<PracticeAnswer>, answerHeadline?: ReactNode): string {
  const answer: PracticeAnswer = {
    questionId: 'q1',
    selectedAnswer: 'A',
    correctAnswer: 'B',
    isCorrect: false,
    ...answerOverrides,
  };

  return renderToStaticMarkup(
    <QuestionCard
      question={createQuestion()}
      answer={answer}
      answerHeadline={answerHeadline}
      onSelectAnswer={() => undefined}
      onNext={() => undefined}
      isLastQuestion={false}
      onRequestExplanation={() => undefined}
    />,
  );
}

function createQuestion(): Question {
  return {
    id: 'q1',
    year: '115',
    category: 'teacher',
    subject: '教育理念與實務',
    questionNumber: '1',
    type: CHOICE_QUESTION_TYPE,
    score: 2,
    group: '評量',
    learningTheme: '評量',
    knowledgeNode: '形成性評量',
    stem: '題幹',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'B',
  };
}
