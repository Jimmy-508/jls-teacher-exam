import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChoiceExplanation } from '../types/ChoiceExplanation';
import ExplanationPanel from './ExplanationPanel';

describe('ExplanationPanel', () => {
  it('renders offline CSV explanation sections', () => {
    const html = renderToStaticMarkup(<ExplanationPanel explanation={createExplanation()} />);

    expect(html).toContain('細說分明');
    expect(html).toContain('題幹分析');
    expect(html).toContain('本題考教育基本法。');
    expect(html).toContain('選項解析');
    expect(html).toContain('A ❌');
    expect(html).toContain('B ✅');
    expect(html).toContain('解題技巧');
    expect(html).toContain('比較法條目的與適用範圍。');
    expect(html).toContain('易混淆概念');
  });

  it('does not render empty headings when offline fields are blank', () => {
    const html = renderToStaticMarkup(
      <ExplanationPanel
        explanation={{
          ...createExplanation(),
          questionKeyPoint: '',
          optionAnalysis: { A: '', B: '', C: '', D: '' },
          learningFeedback: '',
          solvingTechnique: '',
          confusingConcepts: '',
          extendedLearning: {
            relatedKnowledgeNodes: [],
            confusingConcepts: [],
            relatedExamPoints: [],
          },
        }}
      />,
    );

    expect(html).toContain('此題尚未建立解析資料。');
    expect(html).not.toContain('<h3>題幹分析</h3>');
    expect(html).not.toContain('<h3>選項解析</h3>');
  });
});

function createExplanation(): ChoiceExplanation {
  return {
    questionId: 'Q001',
    questionKeyPoint: '本題考教育基本法。',
    optionAnalysis: {
      A: 'A ❌ 未完整對應題幹。',
      B: 'B ✅ 最符合題幹。',
      C: 'C ❌ 混淆概念。',
      D: 'D ❌ 偏離重點。',
    },
    learningFeedback: '',
    solvingTechnique: '比較法條目的與適用範圍。',
    confusingConcepts: '不要把受教權與行政程序混在一起。',
    extendedLearning: {
      relatedKnowledgeNodes: ['教育基本法'],
      confusingConcepts: ['受教權'],
      relatedExamPoints: ['教育法規'],
    },
    provider: 'offline',
    createdAt: '2026-07-09T00:00:00.000Z',
  };
}
