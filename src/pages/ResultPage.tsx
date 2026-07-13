import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LAST_PRACTICE_SESSION_STORAGE_KEY } from '../services/learningEngine';
import { calculateAccuracy } from '../services/questionEngine';
import { load } from '../services/storageService';
import type { PracticeSession } from '../types/PracticeSession';

interface ResultLocationState {
  totalCount: number;
  correctCount: number;
}

function isResultLocationState(value: unknown): value is ResultLocationState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Partial<ResultLocationState>;
  return typeof result.totalCount === 'number' && typeof result.correctCount === 'number';
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
        });
      }
    }

    void loadLastSession();
  }, [locationResult]);

  const result = locationResult ?? storedResult ?? { totalCount: 0, correctCount: 0 };
  const wrongCount = result.totalCount - result.correctCount;
  const accuracy = calculateAccuracy(result.correctCount, result.totalCount);

  return (
    <section className="result-page">
      <h1>本次練習結果</h1>
      <div className="result-summary">
        <div>
          <span>答對題數</span>
          <strong>{result.correctCount}</strong>
        </div>
        <div>
          <span>答錯題數</span>
          <strong>{wrongCount}</strong>
        </div>
        <div>
          <span>正確率</span>
          <strong>{accuracy}%</strong>
        </div>
      </div>
      <Link className="primary-button primary-button--wide" to="/">
        回首頁
      </Link>
    </section>
  );
}
