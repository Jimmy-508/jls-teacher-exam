interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="progress" aria-label={`第 ${current} 題，共 ${total} 題`}>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress__text">
        第 {current} 題 / 共 {total} 題
      </div>
    </div>
  );
}
