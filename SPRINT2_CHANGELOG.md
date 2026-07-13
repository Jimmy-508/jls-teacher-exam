# Sprint 2 Changelog - Memory

Version: v0.2.0

## 新增

- 新增 `src/services/storageService.ts`，集中管理 `localStorage`，並以 Promise API 提供 `save()`、`load()`、`remove()`、`clear()`。
- 新增 `src/services/learningEngine.ts`，提供 LearningRecord 更新、熟悉度計算、QuestionStatus 計算、PracticeSession 建立與恢復輔助。
- 新增 `src/types/LearningRecord.ts`、`src/types/PracticeSession.ts`、`src/types/LearningProfile.ts`、`src/types/QuestionStatus.ts`。
- 每次答題後立即保存 LearningRecord、PracticeSession 與 LearningProfile。
- 支援未完成練習恢復：保存題組、目前題號與已回答答案，重新進入 `/practice` 不會重新抽題。
- ResultPage 可在沒有 route state 時讀取最近完成的 PracticeSession 作為 fallback。

## 修改

- `PracticePage` 接入 StorageService 與 LearningEngine，維持原本逐題作答、立即判斷、下一題與結果頁流程。
- `package.json` 版本更新為 `0.2.0`。
- `README.md` 補充 Sprint 2 Memory 範圍與啟動說明。

## 重構

- 將練習恢復、題組還原、LearningRecord 初始化等邏輯放入 `learningEngine.ts`，避免 Page 承擔商業邏輯。
- 保持 Question immutable，LearningRecord 獨立於 Question，不修改既有 `Question` 型別。

## 已知限制

- 熟悉度演算法目前僅採 Sprint 2 指定簡單規則：答對 +1、答錯 -1，範圍 0 到 4。
- QuestionStatus 僅描述基礎學習階段，尚未導入 SM-2、遺忘曲線或 AI。
- LearningProfile 已建立並保存資料模型，但 Sprint 2 不提供統計或 Dashboard 畫面。
- 此專案仍為純前端 localStorage 儲存，尚未接 IndexedDB、SQLite、Firebase 或資料庫。
