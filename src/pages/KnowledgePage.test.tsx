import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeSummary, LearningThemeCard, LearningThemeList, formatThemeQuestionCount } from './KnowledgePage';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../services/csvService', () => ({
  loadQuestions: vi.fn(async () => [
    {
      id: 'Q001',
      year: '113',
      category: '國小',
      subject: '教育測驗與評量',
      questionNumber: '1',
      type: '選擇題',
      score: 2,
      group: '測驗',
      learningTheme: '測驗',
      knowledgeNode: '信度',
      stem: '題幹',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctAnswer: 'A',
    },
  ]),
}));

vi.mock('../services/storageService', () => ({
  load: vi.fn(async () => ({})),
}));

describe('KnowledgePage', () => {
  it('renders summary familiarity with the same non-compact level bar layout', () => {
    const html = renderToStaticMarkup(<KnowledgeSummary averageFamiliarity={0} learningThemeCount={2} weakThemeCount={1} />);

    expect(html).toContain('平均熟悉度');
    expect(html).toContain('class="familiarity-level-bar"');
    expect(html).not.toContain('familiarity-level-bar--compact');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('Lv. 0');
    expect(html).not.toContain('familiarity-level-bar__ticks');
    expect(html).not.toContain('距離 Lv.');
    expect(html).not.toContain('已達最高等級');
  });

  it('renders Learning Theme list as one collapsed block by default', () => {
    const html = renderToStaticMarkup(
      <LearningThemeList
        themes={[
          createTheme('theme-1', '教育測驗與評量'),
          createTheme('theme-2', '課程發展與設計'),
        ]}
        onPractice={() => undefined}
      />,
    );

    expect(html).toContain('學習主題列表（2）');
    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
    expect(html.indexOf('教育理念與實務')).toBeLessThan(html.indexOf('學習者發展與適性輔導'));
  });

  it('renders Learning Theme card as collapsed details by default', () => {
    const html = renderToStaticMarkup(
      <LearningThemeCard
        theme={{
          averageFamiliarity: 2,
          id: 'theme-1',
          knowledgeNodeIds: ['node-1'],
          lastReviewedAt: undefined,
          name: '教育測驗與評量',
          subject: '教育理念與實務',
          questionCount: 3,
          choiceQuestionCount: 3,
          essayQuestionCount: 0,
          questionIds: ['Q001', 'Q002', 'Q003'],
          wrongCount: 1,
        }}
        onPractice={() => undefined}
      />,
    );

    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
    expect(html).toContain('教育測驗與評量');
    expect(html).toContain('3 題');
    expect(html).toContain('Lv. 50');
    expect(html.match(/平均熟悉度/g)).toHaveLength(1);
    expect(html).not.toContain('距離 Lv.');
    expect(html).not.toContain('已達最高等級');
    expect(html).not.toContain('familiarity-level-bar__ticks');
  });

  it('formats mixed choice and essay question counts clearly', () => {
    expect(formatThemeQuestionCount({ questionCount: 2, choiceQuestionCount: 1, essayQuestionCount: 1 })).toBe(
      '共 2 題（選擇 1／非選 1）',
    );
    expect(formatThemeQuestionCount({ questionCount: 2, choiceQuestionCount: 2, essayQuestionCount: 0 })).toBe('2 題');
  });
});

function createTheme(id: string, name: string, subject = id === 'theme-1' ? '教育理念與實務' : '學習者發展與適性輔導') {
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
    wrongCount: 1,
  };
}
