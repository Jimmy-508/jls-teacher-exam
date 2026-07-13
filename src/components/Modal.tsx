import { type ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  isBusy?: boolean;
  onClose: () => void;
}

export default function Modal({ title, children, isBusy = false, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isBusy) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [isBusy, onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        aria-labelledby="jls-modal-title"
        aria-modal="true"
        className="modal-dialog"
        role="dialog"
        tabIndex={-1}
      >
        <header className="modal-dialog__header">
          <h2 id="jls-modal-title">{title}</h2>
          <button aria-label="關閉" className="modal-dialog__close" disabled={isBusy} type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-dialog__body">{children}</div>
      </div>
    </div>
  );
}
