import type { CSSProperties } from 'react';

export interface FamiliarityLevelBarProps {
  averageFamiliarity: number;
  label?: string;
}

export function familiarityToLevel(averageFamiliarity: number): number {
  const normalizedValue = Number.isFinite(averageFamiliarity) ? averageFamiliarity : 0;
  return Math.max(0, Math.min(100, Math.round((normalizedValue / 4) * 100)));
}

export default function FamiliarityLevelBar({ averageFamiliarity, label = '平均熟悉度' }: FamiliarityLevelBarProps) {
  const level = familiarityToLevel(averageFamiliarity);
  const progressStyle = {
    '--level': String(level),
  } as CSSProperties;

  return (
    <div className="familiarity-level-bar" aria-label={`${label || '平均熟悉度'}等級 ${level}`}>
      {label ? <span>{label}</span> : null}
      <div className="familiarity-level-bar__meter">
        <div
          aria-label={`${label || '平均熟悉度'}等級 ${level}`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={level}
          className="familiarity-level-bar__track"
          role="progressbar"
        >
          <span className={level === 0 ? 'is-empty' : ''} style={progressStyle} />
        </div>
        <strong>Lv. {level}</strong>
      </div>
    </div>
  );
}
