import type { TodayFocus } from '../types/Today';

interface TodayFocusCardProps {
  focus: TodayFocus;
  onStart: () => void;
}

export default function TodayFocusCard({ focus, onStart }: TodayFocusCardProps) {
  return (
    <section className="today-card today-focus-card">
      <span className="today-card__label">今日焦點</span>
      <h2>{focus.learningThemeName}</h2>
      <p className="today-focus-card__meta">
        {focus.questionCount} 題 · 約 {focus.estimatedMinutes} 分鐘
      </p>
      <p>{focus.reason}</p>
      <button className="primary-button" type="button" onClick={onStart}>
        開始今日學習
      </button>
    </section>
  );
}
