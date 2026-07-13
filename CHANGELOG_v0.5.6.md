# CHANGELOG v0.5.6

## 新增

- 正式建立 LearningTheme 作為學習單位。
- TodayFocus 新增 `learningThemeId` 與 `learningThemeName`。
- LearningThemeService 支援 LearningTheme 建立、弱點偵測、主題熟悉度與錯誤率計算。

## 修改

- Question 保留 `group`，並以 `learningTheme` 作為內部優先欄位。
- CSV `類別` 同時對應到 `group` 與 `learningTheme`。
- TodayEngine 以 LearningTheme 選出今日焦點，最多帶入 5 題。
- TodayFocusCard 顯示 LearningTheme 名稱，不使用 KnowledgeNode 名稱作為 Today 顯示標題。
- KnowledgePage 以 LearningTheme 作為主要分組，KnowledgeNode 保留為診斷單位。
- InsightEngine 優先產生 LearningTheme-level 建議。

## 保留

- KnowledgeNode 仍用於答案分析、知識覆蓋、細部診斷與熟悉度追蹤。
- Sprint 1 到 Sprint 5 的既有練習流程保持相容。

## 未實作

- 未新增 AI Answer Analysis。
- 未新增非選題評分。
- 未新增雲端同步、資料庫、登入、CSV 上傳、PWA 或推播。
