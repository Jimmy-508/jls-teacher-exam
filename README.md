# JLS v4.2

## Jarvis Learning System

JLS（Jarvis Learning System）是一套專為教師資格考試打造的個人化學習系統。

它不只是刷題工具，而是整合題庫管理、知識整理、錯題追蹤、熟悉度分析、學習歷程及今日學習規劃的 Learning System。

JLS 採用純前端架構，不需要後端資料庫與使用者帳號，所有學習資料主要儲存在使用者目前使用的瀏覽器中。

## 1. 專案簡介

- JLS 是 Jarvis Learning System 的縮寫。
- Jarvis 是系統的主要品牌名稱。
- 目前版本主要服務教師資格考試準備者。
- JLS 為免費、非官方、個人製作的學習系統。

## 2. 主要功能

- Today：今日學習與進度概覽。
- Practice：選擇題與非選題練習。
- Knowledge：核心概念、熟悉度與知識整理。
- Library：題庫匯入、匯出、CSV 範本、題本匯出、備份及還原。
- Settings：顯示名稱與學習進度管理。
- Result：作答結果、解析及錯題相關資訊。

## 3. 資料儲存方式

- 不需要註冊帳號。
- 題庫與學習資料主要儲存在瀏覽器本機。
- 沒有後端資料庫。
- 沒有帳號式雲端同步。
- 清除瀏覽器網站資料可能造成紀錄遺失。
- 使用無痕模式不適合長期保存學習資料。
- 建議定期備份。
- 備份不包含題庫。
- 更換裝置或瀏覽器時，需另外匯入題庫。

## 4. 題庫與內容來源

題目與標準答案整理自高級中等以下學校及幼兒園教師資格考試官方公開資料。重要資訊以官方最新公告為準。

題幹分析、選項解析、解題技巧、易錯提醒、核心概念及其他學習輔助內容，由 JLS 依公開試題重新整理與撰寫，可能存在疏漏，僅供準備考試與理解概念使用。

JLS 是免費、非官方、個人製作的學習工具，與教育部、教師資格考試承辦單位及其他政府機關沒有隸屬、合作、委託或背書關係。

## 5. 線上使用

網址：[https://jimmy-508.github.io/jls-teacher-exam/](https://jimmy-508.github.io/jls-teacher-exam/)

目前版本：JLS v4.2

## 6. 本機開發

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm preview
```

## 7. 技術架構

- React
- TypeScript
- Vite
- React Router
- Vitest
- LocalStorage
- GitHub Pages

## 8. 使用聲明

JLS 免費提供，為非官方、個人製作的教師資格考試學習工具。

學習資料主要儲存在目前瀏覽器本機。清除瀏覽器網站資料、使用無痕模式、更換瀏覽器、更換裝置或瀏覽器儲存空間被系統回收，都可能造成資料遺失。使用者應定期備份。

JLS 不主動收集或上傳使用者的題庫、作答紀錄與學習資料，但網站託管服務可能依其政策處理維持服務所需的連線資訊。

題目與標準答案整理自官方公開資料，重要資訊以官方最新公告為準。解析與學習內容為重新整理與撰寫，可能存在疏漏。

作者不保證資料在所有裝置或情境下永久保存。

## 9. 作者

Jimmy Lin

## 10. 品牌與版本

- 品牌：Jarvis
- 系統：JLS（Jarvis Learning System）
- 中文副標：Jarvis 教檢隨身考
- 版本：v4.2

## Windows 使用方式

不需要手動輸入 `pnpm` 或 `npm` 指令，可直接雙擊下列批次檔：

第一次安裝或修復依賴：

```text
install-jls.bat
```

平常開發：

```text
start-jls.bat
```

Production Build：

```text
build-jls.bat
```

Production Preview：

```text
preview-jls.bat
```

環境檢查：

```text
diagnose-jls.bat
```

正式發布 GitHub Pages：

```text
publish-github-pages.bat
```
## PWA 圖示更新

若要更新 Android、iPhone/iPad 主畫面圖示與 PWA manifest 圖示，請依序操作：

1. 將新的 PNG 圖示放在 Repository 根目錄。
2. 檔名改成 `icon-source.png`。
3. 雙擊 `update-icons.bat`。

`update-icons.bat` 會自動產生 `public/icons/` 內的 favicon、Apple Touch Icon、一般 PWA 圖示、maskable 圖示與相容舊檔名的圖示，並在產生後執行 Production Build 驗證。若產生或 build 失敗，會還原原本的圖示。

`icon-source.png` 是本機來源檔，已加入 `.gitignore`，不會被提交到 GitHub。正式提交只需要包含產生後的 `public/icons/` 圖示檔。

## 手動檢查離線資源更新

JLS 支援提示式 PWA 更新，不會在使用者作答中強制重新整理。

可在：

```text
Settings → 關於 JLS → 離線資源更新
```

按下「檢查更新」。若偵測到新版本，畫面會顯示「立即更新」按鈕；只有使用者按下後才會套用新版 Service Worker 並重新載入。
