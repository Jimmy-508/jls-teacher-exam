import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import QuestionImage from './QuestionImage';

describe('QuestionImage', () => {
  it('renders normal image sources immediately', () => {
    const html = renderToStaticMarkup(
      <QuestionImage className="question-image" src="/images/stem.png" alt="Question image" />,
    );

    expect(html).toContain('class="question-image"');
    expect(html).toContain('src="/images/stem.png"');
  });

  it('does not render an IndexedDB asset before the browser effect resolves it', () => {
    const html = renderToStaticMarkup(
      <QuestionImage className="question-image" src="jls-question-image:zip%2Fstem.png" alt="Question image" />,
    );

    expect(html).toBe('');
  });
});
