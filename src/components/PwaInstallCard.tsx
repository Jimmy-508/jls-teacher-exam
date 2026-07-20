import { useEffect, useMemo, useState } from 'react';

const IOS_INSTALL_HINT_DISMISSED_KEY = 'jls-ios-install-hint-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);

  return isIos && isSafari;
}

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosHintDismissed, setIsIosHintDismissed] = useState(() => {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(IOS_INSTALL_HINT_DISMISSED_KEY) === 'true';
  });
  const canShowIosHint = useMemo(() => isIosSafari() && !isInstalled && !isIosHintDismissed, [isInstalled, isIosHintDismissed]);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  if (!installPrompt && !canShowIosHint) {
    return null;
  }

  async function handleInstallClick() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }

    setInstallPrompt(null);
  }

  function handleDismissIosHint() {
    localStorage.setItem(IOS_INSTALL_HINT_DISMISSED_KEY, 'true');
    setIsIosHintDismissed(true);
  }

  return (
    <section className="today-card pwa-install-card">
      <h2>安裝 JLS</h2>
      {installPrompt ? (
        <>
          <p>將 JLS 安裝到裝置後，可從主畫面快速開啟，並在完成離線資源準備後離線使用。</p>
          <button className="primary-button" type="button" onClick={() => void handleInstallClick()}>
            安裝 JLS
          </button>
        </>
      ) : null}

      {canShowIosHint ? (
        <>
          <p>iPhone 或 iPad 可在 Safari 使用「分享」→「加入主畫面」安裝 JLS。</p>
          <button className="secondary-button" type="button" onClick={handleDismissIosHint}>
            稍後再說
          </button>
        </>
      ) : null}
    </section>
  );
}
