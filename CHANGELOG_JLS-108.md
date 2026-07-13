# CHANGELOG JLS-108

## Added

- Added Settings support for selecting the AI analysis provider.
- Added provider options for Mock, OpenAI, Ollama (Coming Soon), and Gemini (Coming Soon).
- Added runtime OpenAI API key preference from Settings before `VITE_OPENAI_API_KEY`.
- Added fallback reason when OpenAI is selected without an API key.
- Added tests for AI provider resolution, Settings provider UI, Settings storage, and Practice session restore rules.

## Changed

- Choice explanations now use the currently selected AI provider.
- Essay answer analysis now uses the currently selected AI provider.
- Practice type switching now clears the active practice session and previous answer/analysis state before drawing the new question type.

## Fixed

- Fixed Practice sometimes reusing an old session when switching back to choice questions.
- Fixed provider selection so Mock remains Mock even if an environment key exists.
- Fixed OpenAI selection so user Settings key takes priority over environment key.

## Known Issues

- Ollama and Gemini are visible as Coming Soon options only. They are not connected yet.
