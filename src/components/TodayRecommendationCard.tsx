import type { TodayRecommendation } from '../types/Today';

interface TodayRecommendationCardProps {
  recommendation: TodayRecommendation | null;
  onPractice?: (recommendation: TodayRecommendation) => void;
}

export default function TodayRecommendationCard({ recommendation, onPractice }: TodayRecommendationCardProps) {
  const canPractice = Boolean(recommendation?.targetQuestionIds?.length || recommendation?.targetKnowledgeNode);

  return (
    <section className="today-card">
      <span className="today-card__label">今日建議</span>
      {recommendation ? (
        <>
          <h2>{recommendation.title}</h2>
          <p>{recommendation.description}</p>
          {canPractice ? (
            <button
              aria-label={`前往練習：${recommendation.targetKnowledgeNode ?? recommendation.title}`}
              className="secondary-button"
              type="button"
              onClick={() => onPractice?.(recommendation)}
            >
              前往練習
            </button>
          ) : null}
        </>
      ) : (
        <p>先完成今日焦點，JLS 會再給出下一步。</p>
      )}
    </section>
  );
}
