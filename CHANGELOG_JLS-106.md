# CHANGELOG JLS-106

## Added

- Added fallback messaging when an OpenAI request fails and JLS switches to Mock analysis.
- Added tests for ChoiceExplanation fallback messaging, Essay analysis fallback messaging, and Library duplicate validation removal.

## Changed

- Practice now resolves AI providers at analysis time so `VITE_OPENAI_API_KEY` can select OpenAIProvider for both choice explanations and essay analysis.
- AnswerAnalysisPanel now shows the Mock/fallback summary below the provider badge.
- Library 題庫資訊 now keeps only question bank statistics.
- Library 題庫分析 now keeps only LearningTheme and KnowledgeNode statistics.

## Fixed

- Removed duplicate Valid/errors/warnings display from Library 題庫資訊.
- Removed duplicate Errors/Warnings sections from Library 題庫分析.
- Prevented KnowledgeGapEngine from locking its default provider at module load time.

## Known Issues

- Browser-side OpenAI calls still require a valid `VITE_OPENAI_API_KEY` and network access. If OpenAI fails, JLS falls back to Mock analysis and shows the fallback reason.
