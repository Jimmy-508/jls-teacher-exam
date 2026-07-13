import type { SmartFeedbackResult } from '../types/SmartFeedback';
import { toStars } from '../services/smartFeedback/feedbackLevel';

interface SmartFeedbackPanelProps {
  result: SmartFeedbackResult;
}

export default function SmartFeedbackPanel({ result }: SmartFeedbackPanelProps) {
  return (
    <section className="answer-analysis-panel" aria-labelledby="smart-feedback-title">
      <header className="answer-analysis-header">
        <div>
          <h2 id="smart-feedback-title">作答回饋參考</h2>
          <strong>{toStars(result.level)}</strong>
          <p>{result.summary}</p>
        </div>
      </header>

      {result.coveredConcepts.length > 0 ? (
        <section>
          <h3>你的回答已涵蓋：</h3>
          <ul className="answer-analysis-list">
            {result.coveredConcepts.map((evidence) => (
              <li key={evidence.concept}>
                <span aria-hidden="true">✓</span>
                {evidence.concept}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.missingConcepts.length > 0 ? (
        <section>
          <h3>若再加入下列內容，答案會更完整：</h3>
          <ul className="answer-analysis-list">
            {result.missingConcepts.map((concept) => (
              <li key={concept}>
                <span aria-hidden="true">□</span>
                {concept}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.matchedBonusConcepts.length > 0 ? (
        <section>
          <h3>已寫到的加分概念：</h3>
          <ul className="smart-feedback-concept-list">
            {result.matchedBonusConcepts.map((concept) => (
              <li key={concept}>{concept}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.suggestedBonusConcepts.length > 0 ? (
        <section>
          <h3>可再補充：</h3>
          <p className="smart-feedback-note">加入這些內容，可讓答案更完整。</p>
          <ul className="smart-feedback-concept-list">
            {result.suggestedBonusConcepts.map((concept) => (
              <li key={concept}>{concept}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
