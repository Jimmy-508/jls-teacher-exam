import type { ChoiceExplanation } from '../types/ChoiceExplanation';

interface ExplanationPanelProps {
  explanation: ChoiceExplanation;
}

const optionKeys = ['A', 'B', 'C', 'D'] as const;

export default function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  const optionAnalyses = optionKeys
    .map((key) => explanation.optionAnalysis[key])
    .filter((value) => value.trim().length > 0);
  const hasContent =
    explanation.questionKeyPoint.trim().length > 0 ||
    optionAnalyses.length > 0 ||
    Boolean(explanation.solvingTechnique?.trim()) ||
    Boolean(explanation.confusingConcepts?.trim());

  if (!hasContent) {
    return (
      <section className="explanation-panel">
        <h2>細說分明</h2>
        <p>此題尚未建立解析資料。</p>
      </section>
    );
  }

  return (
    <section className="explanation-panel">
      <h2>細說分明</h2>

      {explanation.questionKeyPoint.trim().length > 0 ? (
        <section>
          <h3>題幹分析</h3>
          <p>{explanation.questionKeyPoint}</p>
        </section>
      ) : null}

      {optionAnalyses.length > 0 ? (
        <section>
          <h3>選項解析</h3>
          <div className="option-analysis">
            {optionAnalyses.map((analysis) => (
              <p key={analysis}>{analysis}</p>
            ))}
          </div>
        </section>
      ) : null}

      {explanation.solvingTechnique?.trim() ? (
        <section>
          <h3>解題技巧</h3>
          <p>{explanation.solvingTechnique}</p>
        </section>
      ) : null}

      {explanation.confusingConcepts?.trim() ? (
        <section>
          <h3>易混淆概念</h3>
          <p>{explanation.confusingConcepts}</p>
        </section>
      ) : null}
    </section>
  );
}
