import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import PwaInstallCard from '../components/PwaInstallCard';
import {
  APP_AUTHOR,
  APP_DESCRIPTION,
  APP_FULL_NAME,
  APP_NAME,
  APP_SUBTITLE,
  APP_VERSION,
} from '../config/appInfo';
import { resetLearningProgress } from '../services/learningProgressResetService';
import { applyPwaUpdate, checkForPwaUpdate, type PwaUpdateCheckResult } from '../services/pwaService';
import { DEFAULT_DISPLAY_NAME, getUserSettings, saveUserSettings } from '../services/userSettingsService';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const settings = await getUserSettings();

      if (isMounted) {
        setDisplayName(settings.displayName);
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSaveSettings() {
    const normalizedDisplayName = displayName.trim() || DEFAULT_DISPLAY_NAME;
    await saveUserSettings({ displayName: normalizedDisplayName });
    setDisplayName(normalizedDisplayName);
    setStatusMessage('設定已儲存。');
  }

  async function handleResetLearningProgress() {
    const confirmed = window.confirm(
      '是否確定初始化學習進度？\n此操作會清除作答紀錄、熟悉度、錯誤次數與學習統計，但不會刪除題庫。',
    );

    if (!confirmed) {
      return;
    }

    await resetLearningProgress();
    setStatusMessage('學習進度已初始化。');
  }

  return (
    <section className="settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>個人設定</p>
      </header>

      <section className="today-card">
        <label className="form-field">
          <span>顯示名稱</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setStatusMessage('');
            }}
            placeholder={DEFAULT_DISPLAY_NAME}
          />
        </label>
        <button className="primary-button" type="button" onClick={handleSaveSettings}>
          儲存
        </button>
        {statusMessage ? <p>{statusMessage}</p> : null}
      </section>

      <section className="today-card">
        <h2>初始化學習進度</h2>
        <p>清除作答紀錄、熟悉度、錯誤次數與學習統計，但保留題庫與基本設定。</p>
        <button className="secondary-button" type="button" onClick={handleResetLearningProgress}>
          初始化學習進度
        </button>
      </section>

      <AboutJlsCard />

      <PwaInstallCard />

      <footer className="app-version-footer">
        <p>
          {APP_NAME} {APP_VERSION}，{APP_FULL_NAME}
        </p>
        <p>本系統以本機瀏覽器資料儲存為主，支援離線學習與題庫管理。</p>
      </footer>
    </section>
  );
}

function AboutJlsCard() {
  const [updateStatus, setUpdateStatus] = useState<PwaUpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  async function handleCheckForUpdate() {
    setIsCheckingUpdate(true);

    try {
      setUpdateStatus(await checkForPwaUpdate());
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  const updateStatusMessage = getPwaUpdateStatusMessage(updateStatus);

  return (
    <details className="today-card about-jls-card">
      <summary className="about-jls-card__summary">
        <span>關於 {APP_NAME}</span>
        <small>
          {APP_NAME} {APP_VERSION}
        </small>
      </summary>

      <div className="about-jls-card__content">
        <header className="about-jls-card__header">
          <dl>
            <div>
              <dt>產品名稱</dt>
              <dd>
                {APP_NAME}（{APP_FULL_NAME}）
              </dd>
            </div>
            <div>
              <dt>副標題</dt>
              <dd>{APP_SUBTITLE}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{APP_VERSION}</dd>
            </div>
          </dl>
        </header>

        <section className="about-jls-section about-jls-update">
          <h3>離線資源更新</h3>
          <p>手動檢查 JLS 是否有新的離線版本可用。</p>
          <div className="about-jls-update__actions">
            <button className="secondary-button" type="button" onClick={handleCheckForUpdate} disabled={isCheckingUpdate}>
              {isCheckingUpdate ? '檢查中…' : '檢查更新'}
            </button>
            {updateStatus === 'update-available' ? (
              <button className="primary-button" type="button" onClick={() => void applyPwaUpdate()}>
                立即更新
              </button>
            ) : null}
          </div>
          {updateStatusMessage ? (
            <p className="about-jls-update__status" role={updateStatus === 'error' ? 'alert' : 'status'} aria-live={updateStatus === 'error' ? 'assertive' : 'polite'}>
              {updateStatusMessage}
            </p>
          ) : null}
        </section>

        <AboutSection title="產品定位">
          <p>
            {APP_NAME} 是為教師資格考學習設計的智慧題庫系統，協助使用者整理題庫、安排練習、追蹤錯題與檢視學習狀態。
          </p>
        </AboutSection>

        <AboutSection title="資料與隱私">
          <p>題庫、作答紀錄與學習進度主要儲存在此瀏覽器中，不會自動同步到雲端服務。</p>
          <p>備份與還原功能可協助你自行保存學習資料。</p>
        </AboutSection>

        <AboutSection title="離線解析模式">
          <p>Practice 解析內容以題庫 CSV 中既有欄位為基礎，不需要 API Key，也不會在作答流程中呼叫線上 AI 服務。</p>
        </AboutSection>

        <AboutSection title="作者">
          <p>{APP_AUTHOR}</p>
        </AboutSection>

        <p className="about-jls-card__footnote">本系統仍會持續依實際使用情境調整學習流程與題庫管理體驗。</p>
        <p className="about-jls-card__description">{APP_DESCRIPTION}</p>
      </div>
    </details>
  );
}

function AboutSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="about-jls-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function getPwaUpdateStatusMessage(status: PwaUpdateCheckResult | null): string {
  switch (status) {
    case 'up-to-date':
      return '目前已是最新版本。';
    case 'update-available':
      return '偵測到新版本，可立即更新。';
    case 'offline':
      return '目前離線，請連線後再檢查更新。';
    case 'unsupported':
      return '此瀏覽器不支援離線更新檢查。';
    case 'not-registered':
      return '離線服務尚未完成註冊，請重新開啟 JLS 後再試。';
    case 'error':
      return '檢查更新失敗，請稍後再試。';
    default:
      return '';
  }
}
