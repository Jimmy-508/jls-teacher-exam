import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
  it('renders accessible dialog markup', () => {
    const html = renderToStaticMarkup(
      <Modal title="備份" onClose={() => undefined}>
        <p>內容</p>
      </Modal>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="jls-modal-title"');
    expect(html).toContain('備份');
  });
});
