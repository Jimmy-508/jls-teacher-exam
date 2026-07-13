import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import ReferenceAnswerPanel from './ReferenceAnswerPanel';

describe('ReferenceAnswerPanel', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  it('collapses the reference answer when questionId changes', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ReferenceAnswerPanel questionId="essay-1" referenceAnswer="第一題參考答案" />);
    });

    const firstDetails = container.querySelector('details') as HTMLDetailsElement;
    firstDetails.open = true;
    firstDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
    expect(firstDetails.open).toBe(true);

    await act(async () => {
      root.render(<ReferenceAnswerPanel questionId="essay-2" referenceAnswer="第二題參考答案" />);
    });

    const secondDetails = container.querySelector('details') as HTMLDetailsElement;
    expect(secondDetails.open).toBe(false);

    await act(async () => {
      root.unmount();
    });
  });
});
