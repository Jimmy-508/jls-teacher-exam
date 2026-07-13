# CHANGELOG JLS-103

## Added

- Added collapsible CSV Validation Report summary in Library.
- Added Practice custom question count option with min/max clamping.
- Added provider status badges for choice explanations and essay answer analysis.
- Added focused tests for Knowledge disclosure, Library validation disclosure, Practice controls, CSV template re-import, and provider status display.

## Changed

- Practice type selection now only offers `選擇題` and `非選題`.
- Practice now defaults to `選擇題`.
- Knowledge Learning Theme card rendering is isolated for testing while preserving the same page behavior.
- Library Validation Report now shows `CSV 驗證提醒：X errors / Y warnings` before expanding details.

## Fixed

- Prevented mixed choice/essay practice sessions from being started via the default Practice controls.
- Ensured custom question counts cannot go below 1 or above the currently eligible question count.
- Made Mock/OpenAI provider status visible in the analysis UI so users know when Mock fallback is being used.

## Known Issues

- Choice question explanation currently uses the existing choice AI provider implementation, which is Mock-based and displays `Mock 分析`.
