import { registerSW } from 'virtual:pwa-register';

export interface PwaRegistrationCallbacks {
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
  onRegisterError?: (error: unknown) => void;
}

export type PwaUpdateCheckResult =
  | 'update-available'
  | 'up-to-date'
  | 'offline'
  | 'unsupported'
  | 'not-registered'
  | 'error';

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

function waitForInstallingWorker(registration: ServiceWorkerRegistration, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let installingWorker = registration.installing;

    const finish = (hasUpdate: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      registration.removeEventListener('updatefound', handleUpdateFound);
      installingWorker?.removeEventListener('statechange', handleStateChange);
      resolve(hasUpdate);
    };

    const handleStateChange = () => {
      if (installingWorker?.state === 'installed' && Boolean(navigator.serviceWorker.controller)) {
        finish(true);
      }
    };

    const handleUpdateFound = () => {
      installingWorker?.removeEventListener('statechange', handleStateChange);
      installingWorker = registration.installing;
      installingWorker?.addEventListener('statechange', handleStateChange);
    };

    const timeoutId = window.setTimeout(() => finish(false), timeoutMs);

    registration.addEventListener('updatefound', handleUpdateFound);
    installingWorker?.addEventListener('statechange', handleStateChange);
    handleStateChange();
  });
}

export async function checkForPwaUpdate(): Promise<PwaUpdateCheckResult> {
  if (!isServiceWorkerSupported()) {
    return 'unsupported';
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'offline';
  }

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration(getPwaBasePath())) ??
      (await Promise.race<ServiceWorkerRegistration | undefined>([
        navigator.serviceWorker.ready,
        new Promise((resolve) => window.setTimeout(() => resolve(undefined), 3000)),
      ]));

    if (!registration) {
      return 'not-registered';
    }

    if (registration.waiting) {
      return 'update-available';
    }

    const updateFound = waitForInstallingWorker(registration);
    const updatedRegistration = await registration.update();

    if (updatedRegistration.waiting || registration.waiting) {
      return 'update-available';
    }

    if (await updateFound) {
      return 'update-available';
    }

    return 'up-to-date';
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[JLS PWA update check]', error);
    }

    return 'error';
  }
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
