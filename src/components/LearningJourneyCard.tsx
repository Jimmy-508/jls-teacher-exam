import type { LearningJourney } from '../types/Today';

interface LearningJourneyCardProps {
  journey: LearningJourney;
}

export default function LearningJourneyCard({ journey }: LearningJourneyCardProps) {
  return (
    <section className="today-card learning-journey-card">
      <span className="today-card__label">今日歷程</span>
      <div className="learning-journey-list">
        {journey.items.map((item) => (
          <div className="learning-journey-item" key={`${item.label}-${item.knowledgeNodeName ?? item.value}`}>
            <span>{item.label}</span>
            {item.knowledgeNodeName ? <strong>{item.knowledgeNodeName}</strong> : null}
            <p>{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
