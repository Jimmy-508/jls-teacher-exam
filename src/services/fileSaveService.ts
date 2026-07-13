export type SaveBlobResult = 'saved' | 'cancelled' | 'downloaded';

export interface SaveBlobWithPickerOptions {
  blob: Blob;
  suggestedName: string;
  mimeType: string;
  extensions: string[];
  description: string;
  useSavePicker?: boolean;
}

interface FileSystemWritableFileStreamLike {
  write(data: ArrayBuffer): Promise<void>;
  close(): Promise<void>;
  abort?(reason?: unknown): Promise<void>;
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

interface WindowWithSaveFilePicker {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandleLike>;
}

export async function saveBlobWithPicker({
  blob,
  suggestedName,
  mimeType,
  extensions,
  description,
  useSavePicker = true,
}: SaveBlobWithPickerOptions): Promise<SaveBlobResult> {
  const browserWindow = window as unknown as WindowWithSaveFilePicker;

  if (useSavePicker && typeof browserWindow.showSaveFilePicker === 'function') {
    let writable: FileSystemWritableFileStreamLike | null = null;

    try {
      const handle = await browserWindow.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description,
            accept: {
              [mimeType]: extensions,
            },
          },
        ],
      });
      writable = await handle.createWritable();
      await writable.write(await blob.arrayBuffer());
      await writable.close();
      return 'saved';
    } catch (error) {
      await abortWritable(writable, error);

      if (isAbortError(error)) {
        return 'cancelled';
      }

      throw error;
    }
  }

  downloadBlob(blob, suggestedName);
  return 'downloaded';
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

async function abortWritable(writable: FileSystemWritableFileStreamLike | null, reason: unknown): Promise<void> {
  if (!writable?.abort) {
    return;
  }

  await writable.abort(reason).catch(() => undefined);
}
