import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TodayFocusCard from './TodayFocusCard';

describe('TodayFocusCard', () => {
  it('renders start button without a leading triangle icon', () => {
    const html = renderToStaticMarkup(
      <TodayFocusCard
        focus={{
          knowledgeNodeId: 'theme-1',
          knowledgeNodeName: '形成性評量',
          learningThemeId: 'theme-1',
          learningThemeName: '形成性評量',
          questionCount: 1,
          questionIds: ['Q1'],
          estimatedMinutes: 2,
          reason: '尚未練習',
        }}
        onStart={() => undefined}
      />,
    );

    expect(html).toContain('開始今日學習');
    expect(html).not.toContain('▶');
    expect(html).not.toContain('practice-action-icon');
  });
});
