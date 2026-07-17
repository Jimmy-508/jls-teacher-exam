import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeSummary, LearningThemeCard, LearningThemeList, formatThemeQuestionCount } from './KnowledgePage';
import type { LearningTheme } from '../types/LearningTheme';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../services/csvService', () => ({
  loadQuestions: vi.fn(async () => []),
}));

vi.mock('../services/storageService', () => ({
  load: vi.fn(async () => ({})),
}));

describe('KnowledgePage', () => {
  it('renders summary familiarity with the same non-compact level bar layout', () => {
    const html = renderToStaticMarkup(<KnowledgeSummary averageFamiliarity={0} learningThemeCount={2} weakThemeCount={1} />);

    expect(html).toContain('class="familiarity-level-bar"');
    expect(html).not.toContain('familiarity-level-bar--compact');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('Lv. 0');
    expect(html).not.toContain('familiarity-level-bar__ticks');
  });

  it('renders Learning Theme list as one collapsed block by default', () => {
    const html = renderToStaticMarkup(
      <LearningThemeList
        themes={[
          createTheme('theme-1', '主題一', '教育原理與制度'),
          createTheme('theme-2', '主題二', '國語文能力測驗'),
        ]}
        onPractice={() => undefined}
      />,
    );

    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
  });

  it('sorts subject groups with Chinese language subject last', () => {
    const html = renderToStaticMarkup(
      <LearningThemeList
        themes={[
          createTheme('theme-1', '主題一', '國語文能力測驗'),
          createTheme('theme-2', '主題二', '教育原理與制度'),
          createTheme('theme-3', '主題三', '中等學校課程與教學'),
          createTheme('theme-4', '主題四', '未分類科目'),
        ]}
        onPractice={() => undefined}
      />,
    );

    expect(html.indexOf('中等學校課程與教學')).toBeLessThan(html.indexOf('教育原理與制度'));
    expect(html.indexOf('教育原理與制度')).toBeLessThan(html.indexOf('未分類科目'));
    expect(html.indexOf('未分類科目')).toBeLessThan(html.indexOf('國語文能力測驗'));
  });

  it('renders Learning Theme card as collapsed details by default', () => {
    const html = renderToStaticMarkup(
      <LearningThemeCard
        theme={createTheme('theme-1', '教育哲學', '教育原理與制度', {
          averageFamiliarity: 2,
          questionCount: 3,
          choiceQuestionCount: 3,
          essayQuestionCount: 0,
          wrongCount: 1,
        })}
        onPractice={() => undefined}
      />,
    );

    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
    expect(html).toContain('教育哲學');
    expect(html).toContain('3');
    expect(html).toContain('Lv. 50');
    expect(html.match(/平均熟悉度/g)).toHaveLength(1);
    expect(html).not.toContain('familiarity-level-bar__ticks');
  });

  it('formats mixed choice and essay question counts clearly', () => {
    expect(formatThemeQuestionCount({ questionCount: 2, choiceQuestionCount: 1, essayQuestionCount: 1 })).toBe(
      '共 2 題（選擇 1／非選 1）',
    );
    expect(formatThemeQuestionCount({ questionCount: 2, choiceQuestionCount: 2, essayQuestionCount: 0 })).toBe('2 題');
  });
});

function createTheme(
  id: string,
  name: string,
  subject: string,
  overrides: Partial<LearningTheme> = {},
): LearningTheme {
  return {
    averageFamiliarity: 2,
    id,
    knowledgeNodeIds: ['node-1'],
    lastReviewedAt: undefined,
    name,
    subject,
    questionCount: 3,
    choiceQuestionCount: 3,
    essayQuestionCount: 0,
    questionIds: ['Q001', 'Q002', 'Q003'],
    wrongCount: 0,
    ...overrides,
  };
}
