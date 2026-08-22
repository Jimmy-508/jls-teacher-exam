import { describe, expect, it } from 'vitest';
import source from './Modal.tsx?raw';

describe('Modal focus lifecycle', () => {
  it('keeps latest busy and close handlers in refs for rerenders', () => {
    expect(source).toContain('const isBusyRef = useRef(isBusy);');
    expect(source).toContain('const onCloseRef = useRef(onClose);');
    expect(source).toContain('isBusyRef.current = isBusy;');
    expect(source).toContain('onCloseRef.current = onClose;');
    expect(source).toContain('onCloseRef.current();');
  });

  it('runs the dialog focus and focus-restore effect only when the modal mounts and unmounts', () => {
    const focusIndex = source.indexOf('dialogRef.current?.focus();');
    const focusEffect = source.slice(focusIndex, source.indexOf('}, []);', focusIndex)) + '}, []);';

    expect(focusIndex).toBeGreaterThan(0);
    expect(focusEffect).toContain('document.addEventListener');
    expect(focusEffect).toContain('document.removeEventListener');
    expect(focusEffect).not.toContain('[isBusy, onClose]');
  });
});