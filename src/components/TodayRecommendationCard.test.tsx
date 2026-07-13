import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TodayRecommendationCard from './TodayRecommendationCard';

describe('TodayRecommendationCard', () => {
  it('renders practice button when recommendation has target question ids', () => {
    const html = renderToStaticMarkup(
      <TodayRecommendationCard
        recommendation={{
          title: '下一步',
          description: '練習形成性評量。',
          targetKnowledgeNode: '形成性評量',
          targetQuestionIds: ['Q1'],
        }}
      />,
    );

    expect(html).toContain('前往練習');
    expect(html).toContain('aria-label="前往練習：形成性評量"');
    expect(html).not.toContain('▶');
    expect(html).not.toContain('practice-action-icon');
  });

  it('does not render practice button when recommendation has no target', () => {
    const html = renderToStaticMarkup(
      <TodayRecommendationCard
        recommendation={{
          title: '下一步',
          description: '先完成今日焦點。',
        }}
      />,
    );

    expect(html).not.toContain('前往練習');
  });
});
