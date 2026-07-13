import { useState } from 'react';
import type { AnswerAnalysisResult } from '../types/AnswerAnalysisResult';

interface AnswerAnalysisPanelProps {
  analysis: AnswerAnalysisResult;
}

export const ANSWER_ANALYSIS_UI_TERMS = {
  title: '答案分析',
  mastered: '題目資訊',
  suggestedAdditions: '解題補充',
  knowledgeCoverageRate: '知識涵蓋率',
  viewReferenceAnswer: '查看參考答案',
  collapseReferenceAnswer: '收合參考答案',
} as const;

export default function AnswerAnalysisPanel({ analysis }: AnswerAnalysisPanelProps) {
  if (analysis.provider === 'manual') {
    return <OfflineAnswerAnalysisPanel analysis={analysis} />;
  }

  return <LegacyAnswerAnalysisPanel analysis={analysis} />;
}

function OfflineAnswerAnalysisPanel({ analysis }: AnswerAnalysisPanelProps) {
  return (
    <section className="answer-analysis-panel" aria-labelledby="answer-analysis-title">
      <header className="answer-analysis-header">
        <div>
          <h2 id="answer-analysis-title">{ANSWER_ANALYSIS_UI_TERMS.title}</h2>
          <span className="provider-status">離線參考答案模式</span>
          <p className="provider-note">{analysis.summary}</p>
        </div>
      </header>

      {analysis.referenceAnswer ? (
        <section>
          <h3>非選參考答案</h3>
          <p>{analysis.referenceAnswer}</p>
        </section>
      ) : null}

      {analysis.mastered.length > 0 ? (
        <section>
          <h3>{ANSWER_ANALYSIS_UI_TERMS.mastered}</h3>
          <CompactList items={analysis.mastered} marker="•" />
        </section>
      ) : null}

      {analysis.suggestedAdditions.length > 0 ? (
        <section>
          <h3>{ANSWER_ANALYSIS_UI_TERMS.suggestedAdditions}</h3>
          <CompactList items={analysis.suggestedAdditions} marker="•" />
        </section>
      ) : null}
    </section>
  );
}

function LegacyAnswerAnalysisPanel({ analysis }: AnswerAnalysisPanelProps) {
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  return (
    <section className="answer-analysis-panel" aria-labelledby="answer-analysis-title">
      <header className="answer-analysis-header">
        <div>
          <h2 id="answer-analysis-title">{ANSWER_ANALYSIS_UI_TERMS.title}</h2>
          <span className="provider-status">智慧題庫</span>
          {analysis.summary ? <p className="provider-note">{analysis.summary}</p> : null}
        </div>
        {analysis.maxScore > 0 ? (
          <div className="answer-analysis-score" aria-label="分數">
            <span aria-hidden="true">{toStars(analysis.rating)}</span>
            <strong>
              {analysis.score} / {analysis.maxScore}
            </strong>
          </div>
        ) : null}
      </header>

      <section>
        <h3>已掌握</h3>
        <CompactList items={analysis.mastered} emptyText="尚無可顯示項目。" marker="✓" />
      </section>

      <section>
        <h3>建議補充</h3>
        <CompactList items={analysis.suggestedAdditions} emptyText="尚無可顯示項目。" marker="□" />
      </section>

      <section>
        <h3>{ANSWER_ANALYSIS_UI_TERMS.knowledgeCoverageRate}</h3>
        <div className="knowledge-coverage">
          <div className="knowledge-coverage-dots" aria-hidden="true">
            {toCoverageDots(analysis.knowledgeCoverageRate).map((isCovered, index) => (
              <span
                className={isCovered ? 'knowledge-coverage-dot knowledge-coverage-dot--covered' : 'knowledge-coverage-dot'}
                key={`coverage-${index}`}
              />
            ))}
          </div>
          <strong>{analysis.knowledgeCoverageRate}%</strong>
        </div>
      </section>

      {analysis.referenceAnswer ? (
        <details className="reference-answer-panel" onToggle={(event) => setIsReferenceOpen(event.currentTarget.open)}>
          <summary>
            {isReferenceOpen
              ? ANSWER_ANALYSIS_UI_TERMS.collapseReferenceAnswer
              : ANSWER_ANALYSIS_UI_TERMS.viewReferenceAnswer}
          </summary>
          <p>{analysis.referenceAnswer}</p>
        </details>
      ) : null}
    </section>
  );
}

function CompactList({
  items,
  emptyText,
  marker,
}: {
  items: readonly string[];
  emptyText?: string;
  marker: string;
}) {
  if (items.length === 0) {
    return emptyText ? <p>{emptyText}</p> : null;
  }

  return (
    <ul className="answer-analysis-list">
      {items.slice(0, 8).map((item) => (
        <li key={item}>
          <span aria-hidden="true">{marker}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function toStars(rating: number): string {
  const normalizedRating = Math.max(1, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(normalizedRating)}${'☆'.repeat(5 - normalizedRating)}`;
}

function toCoverageDots(coverageRate: number): boolean[] {
  const coveredDots = Math.round(Math.max(0, Math.min(100, coverageRate)) / 10);
  return Array.from({ length: 10 }, (_, index) => index < coveredDots);
}
