import { useEffect, useRef, useState } from 'react';
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
import {
  COLOR_THEME_OPTIONS,
  DEFAULT_COLOR_THEME,
  DEFAULT_FEEDBACK_COLOR_SCHEME,
  FEEDBACK_COLOR_SCHEME_OPTIONS,
  applyAppearanceSettings,
  type AppearanceSettings,
  type ColorTheme,
  type FeedbackColorScheme,
} from '../services/appearanceService';
import { resetLearningProgress } from '../services/learningProgressResetService';
import { applyPwaUpdate, checkForPwaUpdate, type PwaUpdateCheckResult } from '../services/pwaService';
import { DEFAULT_DISPLAY_NAME, getUserSettings, saveUserSettings } from '../services/userSettingsService';
import type { UserSettings } from '../types/UserSettings';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState(DEFAULT_DISPLAY_NAME);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(DEFAULT_COLOR_THEME);
  const [feedbackColorScheme, setFeedbackColorScheme] = useState<FeedbackColorScheme>(DEFAULT_FEEDBACK_COLOR_SCHEME);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const savedSettingsRef = useRef<UserSettings>({
    displayName: DEFAULT_DISPLAY_NAME,
    aiProvider: 'mock',
    openAIApiKey: '',
    colorTheme: DEFAULT_COLOR_THEME,
    feedbackColorScheme: DEFAULT_FEEDBACK_COLOR_SCHEME,
  });
  const savedAppearanceRef = useRef<AppearanceSettings>({
    colorTheme: DEFAULT_COLOR_THEME,
    feedbackColorScheme: DEFAULT_FEEDBACK_COLOR_SCHEME,
  });
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const settings = await getUserSettings();
      const savedAppearance: AppearanceSettings = {
        colorTheme: settings.colorTheme ?? DEFAULT_COLOR_THEME,
        feedbackColorScheme: settings.feedbackColorScheme ?? DEFAULT_FEEDBACK_COLOR_SCHEME,
      };
      const savedSettings: UserSettings = {
        ...settings,
        ...savedAppearance,
      };

      if (isMounted) {
        setDisplayName(settings.displayName);
        setColorTheme(savedAppearance.colorTheme);
        setFeedbackColorScheme(savedAppearance.feedbackColorScheme);
        savedSettingsRef.current = savedSettings;
        savedAppearanceRef.current = savedAppearance;
        applyAppearanceSettings(savedAppearance);
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
      applyAppearanceSettings(savedAppearanceRef.current);
    };
  }, []);

  async function handleSaveDisplayName() {
    const normalizedDisplayName = displayName.trim() || DEFAULT_DISPLAY_NAME;
    const nextSettings: UserSettings = {
      ...savedSettingsRef.current,
      displayName: normalizedDisplayName,
    };

    await saveUserSettings(nextSettings);
    savedSettingsRef.current = nextSettings;
    setDisplayName(normalizedDisplayName);
    setStatusMessage('\u986f\u793a\u540d\u7a31\u5df2\u5132\u5b58');
  }

  async function handleSaveAppearance() {
    const nextAppearance: AppearanceSettings = { colorTheme, feedbackColorScheme };
    const nextSettings: UserSettings = {
      ...savedSettingsRef.current,
      ...nextAppearance,
    };

    await saveUserSettings(nextSettings);
    savedSettingsRef.current = nextSettings;
    savedAppearanceRef.current = nextAppearance;
    applyAppearanceSettings(nextAppearance);
    setStatusMessage('\u5916\u89c0\u8a2d\u5b9a\u5df2\u5132\u5b58');
  }

  function handleResetAppearance() {
    const defaultAppearance: AppearanceSettings = {
      colorTheme: DEFAULT_COLOR_THEME,
      feedbackColorScheme: DEFAULT_FEEDBACK_COLOR_SCHEME,
    };

    setColorTheme(defaultAppearance.colorTheme);
    setFeedbackColorScheme(defaultAppearance.feedbackColorScheme);
    applyAppearanceSettings(defaultAppearance);
    setStatusMessage('');
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
      </header>

      <section className="today-card">
        <label className="form-field">
          <span className="settings-display-name-label">{'\u986f\u793a\u540d\u7a31'}</span>
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
        <button className="primary-button" type="button" onClick={handleSaveDisplayName}>
          {'\u5132\u5b58\u986f\u793a\u540d\u7a31'}
        </button>
        {statusMessage ? <p>{statusMessage}</p> : null}
      </section>

      <AppearanceThemeCard
        colorTheme={colorTheme}
        feedbackColorScheme={feedbackColorScheme}
        isOpen={isAppearanceOpen}
        onReset={handleResetAppearance}
        onSave={handleSaveAppearance}
        onSelectColorTheme={(nextTheme) => {
          setColorTheme(nextTheme);
          applyAppearanceSettings({ colorTheme: nextTheme, feedbackColorScheme });
          setStatusMessage('');
        }}
        onSelectFeedbackColorScheme={(nextScheme) => {
          setFeedbackColorScheme(nextScheme);
          applyAppearanceSettings({ colorTheme, feedbackColorScheme: nextScheme });
          setStatusMessage('');
        }}
        onToggle={() => setIsAppearanceOpen((current) => !current)}
      />

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

export function AppearanceThemeCard({
  colorTheme,
  feedbackColorScheme,
  isOpen,
  onReset,
  onSave,
  onSelectColorTheme,
  onSelectFeedbackColorScheme,
  onToggle,
}: {
  colorTheme: ColorTheme;
  feedbackColorScheme: FeedbackColorScheme;
  isOpen: boolean;
  onReset: () => void;
  onSave: () => void;
  onSelectColorTheme: (value: ColorTheme) => void;
  onSelectFeedbackColorScheme: (value: FeedbackColorScheme) => void;
  onToggle: () => void;
}) {
  return (
    <section className="today-card appearance-theme-card">
      <button
        className="appearance-theme-card__summary"
        type="button"
        aria-expanded={isOpen}
        aria-controls="appearance-theme-panel"
        onClick={onToggle}
      >
        <span className="disclosure-icon" aria-hidden="true">
          {isOpen ? '\u25BC' : '\u25B6'}
        </span>
        <span>{'\u5916\u89c0\u4e3b\u984c'}</span>
      </button>

      {isOpen ? (
        <div id="appearance-theme-panel" className="appearance-theme-card__content">
          <p className="settings-hint">
            {'\u9078\u64c7\u9069\u5408\u4f60\u7684 JLS \u914d\u8272\u3002\u6b64\u8a2d\u5b9a\u53ea\u5f71\u97ff\u986f\u793a\uff0c\u4e0d\u6703\u6539\u8b8a\u984c\u5eab\u3001\u4f5c\u7b54\u7d00\u9304\u6216\u5b78\u7fd2\u9032\u5ea6\u3002'}
          </p>

          <section className="appearance-theme-group" aria-labelledby="appearance-color-theme-heading">
            <h2 id="appearance-color-theme-heading">{'\u5916\u89c0\u4e3b\u984c'}</h2>
            <div className="appearance-option-grid">
              {COLOR_THEME_OPTIONS.map((option) => (
                <button
                  className="appearance-option"
                  type="button"
                  key={option.value}
                  aria-pressed={colorTheme === option.value}
                  onClick={() => onSelectColorTheme(option.value)}
                >
                  <span className="appearance-option__name">
                    {option.label}
                    {colorTheme === option.value ? <span className="appearance-option__selected">{'\u2713 \u5df2\u9078\u53d6'}</span> : null}
                  </span>
                  <span className="appearance-option__swatches" aria-hidden="true">
                    {option.swatches.map((swatch) => (
                      <span key={swatch} style={{ backgroundColor: swatch }} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="appearance-theme-group" aria-labelledby="appearance-feedback-heading">
            <h2 id="appearance-feedback-heading">{'\u56de\u994b\u8272'}</h2>
            <div className="appearance-option-grid appearance-option-grid--compact">
              {FEEDBACK_COLOR_SCHEME_OPTIONS.map((option) => (
                <button
                  className="appearance-option"
                  type="button"
                  key={option.value}
                  aria-pressed={feedbackColorScheme === option.value}
                  onClick={() => onSelectFeedbackColorScheme(option.value)}
                >
                  <span className="appearance-option__name">
                    {option.label}
                    {feedbackColorScheme === option.value ? <span className="appearance-option__selected">{'\u2713 \u5df2\u9078\u53d6'}</span> : null}
                  </span>
                  <span className="appearance-option__swatches" aria-hidden="true">
                    {option.swatches.map((swatch) => (
                      <span key={swatch} style={{ backgroundColor: swatch }} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="appearance-theme-card__actions">
            <button className="secondary-button" type="button" onClick={onReset}>
              {'\u6062\u5fa9\u9810\u8a2d\u5916\u89c0'}
            </button>
            <button className="primary-button" type="button" onClick={onSave}>
              {'\u5132\u5b58\u5916\u89c0\u8a2d\u5b9a'}
            </button>
          </div>
        </div>
      ) : null}
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
