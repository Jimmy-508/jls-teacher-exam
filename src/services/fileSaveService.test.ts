import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlobWithPicker } from './fileSaveService';

describe('fileSaveService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses showSaveFilePicker and writes the blob when supported', async () => {
    const blob = new Blob(['PDF'], { type: 'application/pdf' });
    const write = vi.fn(async () => undefined);
    const close = vi.fn(async () => undefined);
    const createWritable = vi.fn(async () => ({ write, close }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));
    vi.stubGlobal('window', { showSaveFilePicker });

    const result = await saveBlobWithPicker({
      blob,
      suggestedName: 'wrong.pdf',
      mimeType: 'application/pdf',
      extensions: ['.pdf'],
      description: 'PDF 檔案',
    });

    expect(result).toBe('saved');
    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'wrong.pdf',
      types: [{ description: 'PDF 檔案', accept: { 'application/pdf': ['.pdf'] } }],
    });
    expect(write).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(close).toHaveBeenCalled();
  });

  it('returns cancelled when the user cancels the picker', async () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    vi.stubGlobal('window', { showSaveFilePicker });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    const result = await saveBlobWithPicker({
      blob: new Blob(['{}'], { type: 'application/json' }),
      suggestedName: 'backup.json',
      mimeType: 'application/json',
      extensions: ['.json'],
      description: 'JLS 備份檔',
    });

    expect(result).toBe('cancelled');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('aborts and rethrows when writing with picker fails', async () => {
    const error = new Error('disk full');
    const write = vi.fn(async () => {
      throw error;
    });
    const close = vi.fn(async () => undefined);
    const abort = vi.fn(async () => undefined);
    const createWritable = vi.fn(async () => ({ write, close, abort }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));
    const createObjectURL = vi.fn(() => 'blob:test');
    vi.stubGlobal('window', { showSaveFilePicker });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    await expect(
      saveBlobWithPicker({
        blob: new Blob(['PDF'], { type: 'application/pdf' }),
        suggestedName: 'wrong.pdf',
        mimeType: 'application/pdf',
        extensions: ['.pdf'],
        description: 'PDF 檔案',
      }),
    ).rejects.toThrow(error);

    expect(abort).toHaveBeenCalledWith(error);
    expect(close).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('aborts and rethrows when closing with picker fails', async () => {
    const error = new Error('close failed');
    const write = vi.fn(async () => undefined);
    const close = vi.fn(async () => {
      throw error;
    });
    const abort = vi.fn(async () => undefined);
    const createWritable = vi.fn(async () => ({ write, close, abort }));
    const showSaveFilePicker = vi.fn(async () => ({ createWritable }));
    const createObjectURL = vi.fn(() => 'blob:test');
    vi.stubGlobal('window', { showSaveFilePicker });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    await expect(
      saveBlobWithPicker({
        blob: new Blob(['PDF'], { type: 'application/pdf' }),
        suggestedName: 'wrong.pdf',
        mimeType: 'application/pdf',
        extensions: ['.pdf'],
        description: 'PDF 檔案',
      }),
    ).rejects.toThrow(error);

    expect(abort).toHaveBeenCalledWith(error);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('falls back to browser download only when picker is unsupported', async () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const createElement = vi.fn(() => ({
      click,
      remove,
      set download(value: string) {
        expect(value).toBe('backup.json');
      },
      set href(value: string) {
        expect(value).toBe('blob:test');
      },
      rel: '',
      style: { display: '' },
    }));
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { body: { appendChild }, createElement });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const result = await saveBlobWithPicker({
      blob: new Blob(['{}'], { type: 'application/json' }),
      suggestedName: 'backup.json',
      mimeType: 'application/json',
      extensions: ['.json'],
      description: 'JLS 備份檔',
    });

    expect(result).toBe('downloaded');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('uses safe download when picker is explicitly disabled', async () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const showSaveFilePicker = vi.fn();
    const createElement = vi.fn(() => ({
      click,
      remove,
      rel: '',
      style: { display: '' },
    }));
    const createObjectURL = vi.fn(() => 'blob:safe');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('window', { showSaveFilePicker });
    vi.stubGlobal('document', { body: { appendChild }, createElement });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const result = await saveBlobWithPicker({
      blob: new Blob(['PDF'], { type: 'application/pdf' }),
      suggestedName: 'wrong.pdf',
      mimeType: 'application/pdf',
      extensions: ['.pdf'],
      description: 'PDF 檔案',
      useSavePicker: false,
    });

    expect(result).toBe('downloaded');
    expect(showSaveFilePicker).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:safe');
  });
});
