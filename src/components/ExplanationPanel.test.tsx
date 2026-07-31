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

  it('marks explanation content blocks to preserve line breaks', () => {
    const html = renderToStaticMarkup(
      <ExplanationPanel
        explanation={{
          ...createExplanation(),
          questionKeyPoint: 'stem analysis line 1\nstem analysis line 2',
          optionAnalysis: { A: 'A analysis line 1\nA analysis line 2', B: '', C: '', D: '' },
          solvingTechnique: 'technique line 1\ntechnique line 2',
          confusingConcepts: 'concept line 1\nconcept line 2',
        }}
      />,
    );

    expect(html.match(/class="preserve-line-breaks"/g)).toHaveLength(3);
    expect(html).toContain('stem analysis line 1\nstem analysis line 2');
    expect(html).toContain('class="compact-inline-text"');
    expect(html).toContain('A analysis line 1\nA analysis line 2');
    expect(html).not.toContain('<p class="preserve-line-breaks">A analysis line 1');
  });

  it('keeps option analyses compact while preserving line breaks in other explanation blocks', () => {
    const html = renderToStaticMarkup(
      <ExplanationPanel
        explanation={{
          ...createExplanation(),
          questionKeyPoint: 'stem first line\nstem second line',
          optionAnalysis: { A: 'A option\nCorrect. Use a focused prompt.', B: 'B option\r\nWrong. Too broad.', C: '', D: '' },
          solvingTechnique: 'technique first line\ntechnique second line',
          confusingConcepts: 'concept first line\nconcept second line',
        }}
      />,
    );

    expect(html.match(/class="compact-inline-text"/g)).toHaveLength(2);
    expect(html).toContain('<p class="compact-inline-text">A option\nCorrect. Use a focused prompt.</p>');
    expect(html).toContain('<p class="compact-inline-text">B option\r\nWrong. Too broad.</p>');
    expect(html).not.toContain('<p class="preserve-line-breaks">A option');
    expect(html).toContain('<p class="preserve-line-breaks">stem first line\nstem second line</p>');
    expect(html).toContain('<p class="preserve-line-breaks">technique first line\ntechnique second line</p>');
    expect(html).toContain('<p class="preserve-line-breaks">concept first line\nconcept second line</p>');
  });

  it('renders compact option analysis labels with parenthesized choice keys', () => {
    const html = renderToStaticMarkup(
      <ExplanationPanel
        explanation={{
          ...createExplanation(),
          questionKeyPoint: 'stem analysis',
          optionAnalysis: {
            A: '(A) \u9078\u9805\u6b63\u78ba\u3002Detailed reason remains.',
            B: '(B) \u9078\u9805\u932f\u8aa4\u3002Wrong reason remains.',
            C: '',
            D: '',
          },
        }}
      />,
    );

    expect(html).toContain('(A) \u9078\u9805\u6b63\u78ba\u3002Detailed reason remains.');
    expect(html).toContain('(B) \u9078\u9805\u932f\u8aa4\u3002Wrong reason remains.');
    expect(html).not.toContain('A \u9078\u9805 \u6b63\u78ba\u3002');
    expect(html).not.toContain('B \u9078\u9805 \u932f\u8aa4\u3002');
    expect(html).not.toContain('A \u9078\u9805\u6b63\u78ba\u3002');
    expect(html).not.toContain('B \u9078\u9805\u932f\u8aa4\u3002');
    expect(html.match(/class="compact-inline-text"/g)).toHaveLength(2);
    expect(html).not.toContain('<p class="preserve-line-breaks">(A)');
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
