import type { KnowledgeNode } from '../types/KnowledgeNode';
import type { KnowledgeNodeStatus } from '../services/knowledgeService';

interface KnowledgeNodeCardProps {
  node: KnowledgeNode;
  status: KnowledgeNodeStatus;
  wrongRate: number;
  onPractice: (knowledgeNodeName: string) => void;
}

const statusLabel: Record<KnowledgeNodeStatus, string> = {
  NeedsReview: '需要複習',
  Learning: '學習中',
  Stable: '穩定',
  Unseen: '尚未練習',
};

export default function KnowledgeNodeCard({ node, status, wrongRate, onPractice }: KnowledgeNodeCardProps) {
  return (
    <article className="knowledge-card">
      <div className="knowledge-card__header">
        <h2>{node.name}</h2>
        <span className={`knowledge-status knowledge-status--${status}`}>{statusLabel[status]}</span>
      </div>

      <dl className="knowledge-metrics">
        <div>
          <dt>題數</dt>
          <dd>{node.questionCount}</dd>
        </div>
        <div>
          <dt>錯誤次數</dt>
          <dd>{node.wrongCount}</dd>
        </div>
        <div>
          <dt>錯誤率</dt>
          <dd>{Math.round(wrongRate * 100)}%</dd>
        </div>
        <div>
          <dt>平均熟悉度</dt>
          <dd>{node.averageFamiliarity}</dd>
        </div>
      </dl>

      <button className="secondary-button" type="button" onClick={() => onPractice(node.name)}>
        練習此節點
      </button>
    </article>
  );
}
