import { afterEach, describe, expect, it, vi } from 'vitest';

const registerSWMock = vi.hoisted(() =>
  vi.fn<(options: Record<string, (...args: unknown[]) => void>) => (reloadPage?: boolean) => Promise<void>>(
    () => vi.fn(async () => undefined),
  ),
);

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock,
}));

import { checkForPwaUpdate, getPwaBasePath, registerJlsServiceWorker } from './pwaService';

describe('pwaService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
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
  it('reports unsupported when Service Worker is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(checkForPwaUpdate()).resolves.toBe('unsupported');
  });

  it('reports offline before checking registration', async () => {
    vi.stubGlobal('navigator', {
      onLine: false,
      serviceWorker: { getRegistration: vi.fn() },
    });

    await expect(checkForPwaUpdate()).resolves.toBe('offline');
  });

  it('reports update-available when a waiting worker exists', async () => {
    const registration = {
      waiting: {},
      installing: null,
      update: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('navigator', {
      onLine: true,
      serviceWorker: {
        controller: {},
        getRegistration: vi.fn(async () => registration),
        ready: Promise.resolve(registration),
      },
    });

    await expect(checkForPwaUpdate()).resolves.toBe('update-available');
    expect(registration.update).not.toHaveBeenCalled();
  });

});
