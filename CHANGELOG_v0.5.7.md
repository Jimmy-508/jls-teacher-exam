# CHANGELOG v0.5.7

## 新增

- 新增 Question Bank Validator。
- 新增 Question Bank Validation types。
- 新增 Question Bank Summary service。
- 新增 QuestionBank page 顯示題庫健康檢查。
- 新增 `npm run report:question-bank` 產生 `QUESTION_BANK_REPORT.md`。
- 新增 `docs/data/QUESTION_BANK_GUIDE.md`。
- 新增 `docs/adr/ADR-014-Question-Bank-Validation.md`。

## 修改

- CSV parser 加強 BOM、空行、header 前後空白、quoted commas、optional fields 支援。
- `csvService` 改用集中欄位定義，保持 `類別 -> learningTheme`、`知識節點 -> knowledgeNode`。
- README / package version 更新為 v0.5.7。

## 未實作

- 未新增 CSV upload UI。
- 未新增 database、cloud sync、login、multi-user support。
- 未新增 AI Answer Analysis 或 essay scoring。

