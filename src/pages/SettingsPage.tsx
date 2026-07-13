import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  APP_AUTHOR,
  APP_DESCRIPTION,
  APP_FULL_NAME,
  APP_NAME,
  APP_SUBTITLE,
  APP_VERSION,
} from '../config/appInfo';
import { resetLearningProgress } from '../services/learningProgressResetService';
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
        <p>系統設定</p>
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
        <p>清除作答紀錄、熟悉度、錯誤次數與學習統計，保留匯入題庫與基本設定。</p>
        <button className="secondary-button" type="button" onClick={handleResetLearningProgress}>
          初始化學習進度
        </button>
      </section>

      <AboutJlsCard />

      <footer className="app-version-footer">
        <p>
          {APP_NAME} {APP_VERSION}｜{APP_FULL_NAME}
        </p>
        <p>免費、非官方的教師資格考試學習系統</p>
        <p>學習資料儲存在目前瀏覽器，請定期備份。</p>
      </footer>
    </section>
  );
}

function AboutJlsCard() {
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
              <dt>品牌名稱</dt>
              <dd>
                {APP_NAME}（{APP_FULL_NAME}）
              </dd>
            </div>
            <div>
              <dt>中文副標</dt>
              <dd>{APP_SUBTITLE}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>{APP_VERSION}</dd>
            </div>
          </dl>
        </header>

        <AboutSection title="系統簡介">
          <p>{APP_NAME}（{APP_FULL_NAME}）是一套專為教師資格考試打造的個人化學習系統。</p>
          <p>
            它不只是刷題工具，也整合題庫管理、核心概念整理、熟悉度分析、錯題追蹤、學習歷程及今日學習等功能，希望協助使用者建立長期且有效率的學習流程。
          </p>
        </AboutSection>

        <AboutSection title="題庫與解析">
          <p>本系統收錄之教師資格考試題目與標準答案，整理自高級中等以下學校及幼兒園教師資格考試官方公開資料。</p>
          <p>題目與答案若與官方最新公告不一致，應以官方公告為準。</p>
          <p>
            題幹分析、選項解析、解題技巧、易錯提醒、核心概念及其他補充內容，為 {APP_NAME}{' '}
            依公開試題重新整理與撰寫的學習輔助內容。
          </p>
          <p>相關內容可能存在疏漏，僅供準備考試與理解概念使用，不應取代官方公告、法規原文、正式教材或專業意見。</p>
        </AboutSection>

        <AboutSection title="資料儲存">
          <p>{APP_NAME} 不需要註冊帳號。</p>
          <p>
            使用者匯入的題庫、作答紀錄、錯題紀錄、熟悉度、學習統計及系統設定，主要儲存在目前使用的瀏覽器本機空間。
          </p>
          <p>{APP_NAME} 不會主動將上述題庫與學習資料上傳給作者。</p>
        </AboutSection>

        <AboutSection title="資料保存提醒">
          <p>
            清除瀏覽器網站資料、使用無痕模式、更換瀏覽器、更換裝置、瀏覽器儲存空間被系統回收，或網站資料發生異常時，都可能造成學習紀錄遺失。
          </p>
          <p>請定期使用 Library 的備份功能保存學習資料。</p>
          <p>備份檔不包含題庫；更換裝置或瀏覽器時，必須另外匯入題庫。</p>
        </AboutSection>

        <AboutSection title="網站託管">
          <p>本網站透過 GitHub Pages 提供服務。</p>
          <p>GitHub 可能依其隱私權與安全政策處理維持網站服務所需的連線資訊。</p>
          <p>{APP_NAME} 本身不使用廣告追蹤器，也不主動建立使用者行為分析或學習資料回傳機制。</p>
        </AboutSection>

        <AboutSection title="非官方聲明">
          <p>{APP_NAME} 為個人製作的非官方學習工具，與教育部、教師資格考試承辦單位及其他政府機關沒有隸屬、合作、委託或背書關係。</p>
        </AboutSection>

        <AboutSection title="使用責任">
          <p>{APP_NAME} 以現況免費提供，不保證所有內容永久正確、完整、持續可用或適用於每一位使用者。</p>
          <p>使用者應自行確認重要資訊並妥善備份資料。</p>
          <p>因瀏覽器、裝置、網路、第三方服務或操作方式造成的資料遺失，作者無法保證可以復原。</p>
        </AboutSection>

        <AboutSection title="作者">
          <p>{APP_AUTHOR}</p>
        </AboutSection>

        <p className="about-jls-card__footnote">免費使用・非官方工具・請定期備份學習資料</p>
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
