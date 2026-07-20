import { describe, expect, it, vi } from 'vitest';

const registerSWMock = vi.hoisted(() =>
  vi.fn<(options: Record<string, (...args: unknown[]) => void>) => (reloadPage?: boolean) => Promise<void>>(
    () => vi.fn(async () => undefined),
  ),
);

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock,
}));

import { getPwaBasePath, registerJlsServiceWorker } from './pwaService';

describe('pwaService', () => {
  it('uses the GitHub Pages base path from Vite', () => {
    expect(getPwaBasePath()).toBe('/jls-teacher-exam/');
  });

  it('registers the service worker with prompt-based lifecycle callbacks', () => {
    const offlineReady = vi.fn();
    const needRefresh = vi.fn();
    const registerError = vi.fn();
    const persist = vi.fn(async () => true);
    vi.stubGlobal('navigator', {
      serviceWorker: {},
      storage: { persist },
    });

    registerJlsServiceWorker({
      onOfflineReady: offlineReady,
      onNeedRefresh: needRefresh,
      onRegisterError: registerError,
    });

    expect(registerSWMock).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: false,
        onOfflineReady: expect.any(Function),
        onNeedRefresh: expect.any(Function),
        onRegisteredSW: expect.any(Function),
        onRegisterError: expect.any(Function),
      }),
    );

    const options = registerSWMock.mock.calls[0]?.[0];
    expect(options).toBeDefined();
    if (!options) {
      throw new Error('registerSW options missing');
    }
    options.onOfflineReady();
    options.onNeedRefresh();
    options.onRegisterError(new Error('boom'));
    options.onRegisteredSW();

    expect(offlineReady).toHaveBeenCalled();
    expect(needRefresh).toHaveBeenCalled();
    expect(registerError).toHaveBeenCalled();
    expect(persist).toHaveBeenCalled();
  });
});
