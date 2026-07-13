# Question Bank Guide

Version: v0.5.7

## Purpose

JLS uses `public/questions.csv` as the current question bank source. v0.5.7 does not change the CSV format and does not add upload UI. It prepares the app to safely handle more years, subjects, LearningThemes, KnowledgeNodes, and questions.

## Required CSV Headers

The CSV must keep these existing headers:

- `ID`
- `年度`
- `類科`
- `科目`
- `題號`
- `題型`
- `分數`
- `類別`
- `知識節點`
- `題幹`
- `A`
- `B`
- `C`
- `D`
- `標準答案`
- `我的答案`
- `是否答對`
- `熟悉度`
- `錯誤次數`
- `已抽過`
- `最後複習`
- `下次複習`
- `來源頁`
- `備註`
- `捷徑關鍵字`

## Data Meaning

- `類別` = LearningTheme
- `知識節點` = KnowledgeNode
- LearningTheme is the learning unit used by Today, Practice, Review, Analytics, and Recommendations.
- KnowledgeNode is the diagnostic unit used for answer analysis, coverage, gap analysis, and fine-grained familiarity.

## Adding New Years

Add rows with the new `年度` value. Keep `ID` unique across the whole CSV, not only within the same year.

Recommended ID examples:

- `113-EDU-001`
- `112-PRIMARY-015`

## Adding New Subjects

Use the existing `科目` column. Keep subject names consistent, for example do not mix `教育原理` and `教原` unless they are intentionally different subjects.

## Common Mistakes

- Missing `ID`
- Duplicate `ID`
- Missing `類別`
- Missing `知識節點`
- Missing `題幹`
- Choice question without A/B/C/D
- Choice question answer not equal to A, B, C, or D
- Essay question with A/B/C/D options
- Slightly different LearningTheme names that should be the same

## Recommended Classification Examples

```text
LearningTheme: 教學評量
KnowledgeNode: 形成性評量
KnowledgeNode: 總結性評量

LearningTheme: 班級經營
KnowledgeNode: 正向管教
KnowledgeNode: 親師溝通

LearningTheme: 教育哲學
KnowledgeNode: 杜威
KnowledgeNode: 實用主義
```

## Validation

Run:

```bash
npm run report:question-bank
```

If `npm` is unavailable in the local runtime, use the project package manager equivalent:

```bash
pnpm report:question-bank
```

The generated `QUESTION_BANK_REPORT.md` includes summary counts, grouped counts, warnings, and errors.

