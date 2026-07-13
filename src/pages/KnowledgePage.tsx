import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FamiliarityLevelBar from '../components/FamiliarityLevelBar';
import { loadQuestions } from '../services/csvService';
import { LEARNING_RECORDS_STORAGE_KEY } from '../services/learningEngine';
import { buildLearningThemes, compareSubjects, detectWeakLearningThemes } from '../services/learningThemeService';
import { load } from '../services/storageService';
import type { LearningRecord } from '../types/LearningRecord';
import type { LearningTheme } from '../types/LearningTheme';

export default function KnowledgePage() {
  const navigate = useNavigate();
  const [learningThemes, setLearningThemes] = useState<LearningTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadKnowledge() {
      try {
        const questions = await loadQuestions();
        const recordsByQuestionId = (await load<Record<string, LearningRecord>>(LEARNING_RECORDS_STORAGE_KEY)) ?? {};
        const themes = buildLearningThemes(questions, Object.values(recordsByQuestionId));

        if (!isMounted) {
          return;
        }

        setLearningThemes(themes);
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : 'Knowledge 載入失敗。');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadKnowledge();

    return () => {
      isMounted = false;
    };
  }, []);

  const weakThemes = useMemo(() => detectWeakLearningThemes(learningThemes), [learningThemes]);
  const averageFamiliarity =
    learningThemes.length > 0
      ? Number(
          (
            learningThemes.reduce((sum, theme) => sum + theme.averageFamiliarity, 0) / learningThemes.length
          ).toFixed(2),
        )
      : 0;

  function handlePracticeTheme(theme: LearningTheme) {
    navigate('/practice', {
      state: {
        learningTheme: theme.name,
        subject: theme.subject,
        questionIds: theme.questionIds,
      },
    });
  }

  if (isLoading) {
    return <div className="status-page">Knowledge 載入中...</div>;
  }

  if (errorMessage) {
    return (
      <section className="status-page">
        <h1>無法載入 Knowledge</h1>
        <p>{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="knowledge-page">
      <header className="page-header">
        <h1>Knowledge</h1>
      </header>

      <KnowledgeSummary
        averageFamiliarity={averageFamiliarity}
        learningThemeCount={learningThemes.length}
        weakThemeCount={weakThemes.length}
      />

      <LearningThemeList themes={learningThemes} onPractice={handlePracticeTheme} />
    </section>
  );
}

export function KnowledgeSummary({
  averageFamiliarity,
  learningThemeCount,
  weakThemeCount,
}: {
  averageFamiliarity: number;
  learningThemeCount: number;
  weakThemeCount: number;
}) {
  return (
    <div className="knowledge-summary">
      <div>
        <span>學習主題</span>
        <strong>{learningThemeCount}</strong>
      </div>
      <div className="knowledge-summary__familiarity">
        <FamiliarityLevelBar averageFamiliarity={averageFamiliarity} />
      </div>
      <div>
        <span>弱點主題</span>
        <strong>{weakThemeCount}</strong>
      </div>
    </div>
  );
}

export function LearningThemeCard({
  theme,
  onPractice,
}: {
  theme: LearningTheme;
  onPractice: (theme: LearningTheme) => void;
}) {
  return (
    <details className="knowledge-card knowledge-theme-card">
      <summary>
        <div className="knowledge-theme-card__summary">
          <h2>{theme.name}</h2>
          <FamiliarityLevelBar averageFamiliarity={theme.averageFamiliarity} />
          <span>{formatThemeQuestionCount(theme)}</span>
        </div>
      </summary>
      <dl className="knowledge-metrics">
        <div>
          <dt>核心概念</dt>
          <dd>{theme.knowledgeNodeIds.length}</dd>
        </div>
        <div>
          <dt>錯誤次數</dt>
          <dd>{theme.wrongCount}</dd>
        </div>
        <div>
          <dt>最近作答</dt>
          <dd>{theme.lastReviewedAt ? formatDate(theme.lastReviewedAt) : '尚無'}</dd>
        </div>
      </dl>
      <button className="secondary-button" type="button" onClick={() => onPractice(theme)}>
        練習此主題
      </button>
    </details>
  );
}

export function LearningThemeList({
  themes,
  onPractice,
}: {
  themes: readonly LearningTheme[];
  onPractice: (theme: LearningTheme) => void;
}) {
  const subjectGroups = groupThemesBySubject(themes);

  return (
    <details className="knowledge-theme-list">
      <summary>學習主題列表（{themes.length}）</summary>
      <div className="knowledge-subject-list">
        {subjectGroups.map((group) => (
          <details className="knowledge-subject-group" key={group.subject}>
            <summary>
              {group.subject}（{group.themes.length}）
            </summary>
            <div className="knowledge-list">
              {group.themes.map((theme) => (
                <LearningThemeCard key={theme.id} theme={theme} onPractice={onPractice} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}

export function formatThemeQuestionCount(
  theme: Pick<LearningTheme, 'choiceQuestionCount' | 'essayQuestionCount' | 'questionCount'>,
): string {
  if (theme.choiceQuestionCount > 0 && theme.essayQuestionCount > 0) {
    return `共 ${theme.questionCount} 題（選擇 ${theme.choiceQuestionCount}／非選 ${theme.essayQuestionCount}）`;
  }

  return `${theme.questionCount} 題`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function groupThemesBySubject(themes: readonly LearningTheme[]): Array<{ subject: string; themes: LearningTheme[] }> {
  const groups = new Map<string, LearningTheme[]>();

  themes.forEach((theme) => {
    const subject = theme.subject.trim() || '未分類科目';
    groups.set(subject, [...(groups.get(subject) ?? []), theme]);
  });

  return Array.from(groups.entries())
    .map(([subject, subjectThemes]) => ({
      subject,
      themes: [...subjectThemes].sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant')),
    }))
    .sort((left, right) => compareSubjects(left.subject, right.subject));
}
