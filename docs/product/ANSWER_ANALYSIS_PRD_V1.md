# Answer Analysis PRD v1 Implementation

Status: Implemented foundation

## Product Terms

- 答案分析
- 已掌握
- 建議補充
- 知識涵蓋率
- 查看參考答案
- 收合參考答案

## Behavior

Answer Analysis focuses on knowledge gaps before score. Score is optional and secondary.

The first implementation provides:

- `AnswerAnalysis` domain type
- deterministic `answerAnalysisEngine`
- collapsed reference answer UI
- LearningRecord update helper based on mastered and missing KnowledgeNodes
- `MockAIProvider.evaluateEssay()` returning AnswerAnalysis without external API calls

## Rules

- 知識涵蓋率 is calculated from KnowledgeNodes, not score.
- Mastered Knowledge is limited to 5 items.
- Suggested Additions is limited to 5 items.
- 查看參考答案 is collapsed by default.
- Learning updates are based on mastered and suggested KnowledgeNodes, not score alone.

## Out Of Scope

- Real external AI provider
- Long generated explanations
- Essay scoring model
- Database or cloud sync
- Full essay practice workflow
