interface ProgressBarProps {
  current: number;
  total: number;
  mode?: 'position' | 'remaining';
  label?: string;
}

export default function ProgressBar({ current, total, mode = 'position', label }: ProgressBarProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  const text = label ?? (mode === 'remaining' ? `剩餘 ${current} / ${total} 題` : `第 ${current} 題 / 共 ${total} 題`);

  return (
    <div className="progress" aria-label={text}>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress__text">{text}</div>
    </div>
  );
}
