import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applyPwaUpdate, registerJlsServiceWorker } from '../services/pwaService';

type PwaStatus = 'offline-ready' | 'update-ready' | 'error' | null;

export default function PwaStatusBanner() {
  const location = useLocation();
  const [status, setStatus] = useState<PwaStatus>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    registerJlsServiceWorker({
      onOfflineReady() {
        setStatus('offline-ready');
        setIsDismissed(false);
      },
      onNeedRefresh() {
        setStatus('update-ready');
        setIsDismissed(false);
      },
      onRegisterError(error) {
        if (import.meta.env.DEV) {
          console.error('[JLS PWA registration]', error);
        }

        setStatus('error');
        setIsDismissed(false);
      },
    });
  }, []);

  if (!status || isDismissed) {
    return null;
  }

  const isPracticeRoute = location.pathname === '/practice';

  if (status === 'offline-ready') {
    return (
      <aside className="pwa-banner" role="status" aria-live="polite">
        <p>JLS 已可離線使用</p>
        <button className="secondary-button" type="button" onClick={() => setIsDismissed(true)}>
          知道了
        </button>
      </aside>
    );
  }

  if (status === 'error') {
    return (
      <aside className="pwa-banner pwa-banner--warning" role="alert" aria-live="assertive">
        <p>離線資源準備失敗，請重新載入頁面後再試一次。</p>
        <button className="secondary-button" type="button" onClick={() => setIsDismissed(true)}>
          知道了
        </button>
      </aside>
    );
  }

  return (
    <aside className="pwa-banner" role="status" aria-live="polite">
      <p>{isPracticeRoute ? 'JLS 有新版本可用，建議完成本次練習後再更新。' : 'JLS 有新版本可用'}</p>
      <div className="pwa-banner__actions">
        <button className="primary-button" type="button" onClick={() => void applyPwaUpdate()}>
          立即更新
        </button>
        <button className="secondary-button" type="button" onClick={() => setIsDismissed(true)}>
          稍後
        </button>
      </div>
    </aside>
  );
}
