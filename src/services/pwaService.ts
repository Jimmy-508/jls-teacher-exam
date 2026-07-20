import { registerSW } from 'virtual:pwa-register';

export interface PwaRegistrationCallbacks {
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
  onRegisterError?: (error: unknown) => void;
}

let isRegistered = false;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function getPwaBasePath(): string {
  return import.meta.env.BASE_URL || '/';
}

export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function registerJlsServiceWorker(callbacks: PwaRegistrationCallbacks = {}): void {
  if (isRegistered || !isServiceWorkerSupported()) {
    return;
  }

  isRegistered = true;
  updateServiceWorker = registerSW({
    immediate: false,
    onOfflineReady() {
      callbacks.onOfflineReady?.();
    },
    onNeedRefresh() {
      callbacks.onNeedRefresh?.();
    },
    onRegisteredSW() {
      void requestPersistentStorage();
    },
    onRegisterError(error) {
      callbacks.onRegisterError?.(error);
    },
  });
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateServiceWorker) {
    return;
  }

  await updateServiceWorker(true);
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[JLS PWA persistent storage]', error);
    }

    return false;
  }
}
