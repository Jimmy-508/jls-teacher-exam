# CHANGELOG JLS-107

## Added

- Added OpenAI API key normalization tests.

## Changed

- Choice OpenAIProvider now reads `VITE_OPENAI_API_KEY` at provider construction time instead of using a cached config key.
- Essay OpenAIProvider now reads `VITE_OPENAI_API_KEY` at provider construction time instead of using a cached config key.
- API key detection now trims whitespace and removes surrounding quotes.

## Fixed

- Reduced the chance of Practice remaining on Mock because an OpenAI key was cached as empty during module initialization.
- Preserved Mock fallback only for missing API key or failed OpenAI request.

## Known Issues

- No `.env` or shell `VITE_OPENAI_API_KEY` was present in this workspace during verification. A running Vite dev server must be restarted after adding or changing `VITE_OPENAI_API_KEY`.
