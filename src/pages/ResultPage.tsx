import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LAST_PRACTICE_SESSION_STORAGE_KEY } from '../services/learningEngine';
import { calculateAccuracy } from '../services/questionEngine';
import { ESSAY_QUESTION_TYPE } from '../services/questionBankFields';
import { toStars } from '../services/smartFeedback/feedbackLevel';
import { load } from '../services/storageService';
import type { PracticeSession } from '../types/PracticeSession';
import type { QuestionType } from '../types/question';

interface ResultLocationState {
  totalCount: number;
  correctCount: number;
  wrongCount?: number;
  gradableCount?: number;
  questionType?: QuestionType;
  averageFeedbackLevel?: 1 | 2 | 3 | 4 | 5;
}

function isResultLocationState(value: unknown): value is ResultLocationState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Partial<ResultLocationState>;
  return (
    typeof result.totalCount === 'number' &&
    typeof result.correctCount === 'number' &&
    (typeof result.wrongCount === 'number' || typeof result.wrongCount === 'undefined') &&
    (typeof result.gradableCount === 'number' || typeof result.gradableCount === 'undefined') &&
    (typeof result.questionType === 'string' || typeof result.questionType === 'undefined') &&
    (typeof result.averageFeedbackLevel === 'number' || typeof result.averageFeedbackLevel === 'undefined')
  );
}

export default function ResultPage() {
  const location = useLocation();
  const locationResult = isResultLocationState(location.state) ? location.state : null;
  const [storedResult, setStoredResult] = useState<ResultLocationState | null>(null);

  useEffect(() => {
    if (locationResult) {
      return;
    }

    async function loadLastSession() {
      const session = await load<PracticeSession>(LAST_PRACTICE_SESSION_STORAGE_KEY);

      if (session) {
        setStoredResult({
          totalCount: session.totalQuestions,
          correctCount: session.correctCount,
          wrongCount: session.wrongCount,
          gradableCount: session.correctCount + session.wrongCount,
          questionType: session.questionType,
          averageFeedbackLevel: session.averageFeedbackLevel,
        });
      }
    }

    void loadLastSession();
  }, [locationResult]);

  const result = locationResult ?? storedResult ?? { totalCount: 0, correctCount: 0 };
  const wrongCount = result.wrongCount ?? result.totalCount - result.correctCount;
  const gradableCount = result.gradableCount ?? result.totalCount;
  const accuracy = gradableCount > 0 ? `${calculateAccuracy(result.correctCount, gradableCount)}%` : '無可評分題目';
  const isEssayResult = result.questionType === ESSAY_QUESTION_TYPE;
  const averageStars =
    typeof result.averageFeedbackLevel === 'number' ? toStars(result.averageFeedbackLevel) : '尚未評估';
  const correctCountDisplay = isEssayResult ? '不列入計算' : result.correctCount;
  const wrongCountDisplay = isEssayResult ? '不列入計算' : wrongCount;

  return (
    <section className="result-page">
      <h1>練習結果</h1>
      <div className="result-summary">
        <div>
          <span>答對題數</span>
          <strong>{correctCountDisplay}</strong>
        </div>
        <div>
          <span>答錯題數</span>
          <strong>{wrongCountDisplay}</strong>
        </div>
        <div>
          <span>{isEssayResult ? '核心概念' : '正確率'}</span>
          <strong>{isEssayResult ? averageStars : accuracy}</strong>
        </div>
      </div>
      <Link className="primary-button primary-button--wide" to="/">
        回到首頁
      </Link>
    </section>
  );
}
