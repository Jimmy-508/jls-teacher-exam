import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OPENAI_MISSING_KEY_FALLBACK_REASON,
  getConfiguredOpenAIApiKey,
  resolveConfiguredAIProvider,
} from './openAIKeyService';
import { getUserSettings } from './userSettingsService';

vi.mock('./userSettingsService', () => ({
  getUserSettings: vi.fn(),
}));

describe('openAIKeyService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses OpenAI API key stored in Settings', async () => {
    vi.mocked(getUserSettings).mockResolvedValue({
      displayName: 'Jimmy',
      openAIApiKey: ' "runtime-key" ',
    });

    await expect(getConfiguredOpenAIApiKey()).resolves.toBe('runtime-key');
  });

  it('uses user OpenAI key before env key', () => {
    expect(resolveConfiguredAIProvider('openai', 'user-key', 'env-key')).toEqual({
      provider: 'openai',
      openAIApiKey: 'user-key',
    });
  });

  it('uses env OpenAI key when user key is missing', () => {
    expect(resolveConfiguredAIProvider('openai', '', 'env-key')).toEqual({
      provider: 'openai',
      openAIApiKey: 'env-key',
    });
  });

  it('falls back to Mock when OpenAI is selected without any key', () => {
    expect(resolveConfiguredAIProvider('openai', '', '')).toEqual({
      provider: 'mock',
      openAIApiKey: '',
      fallbackReason: OPENAI_MISSING_KEY_FALLBACK_REASON,
    });
  });

  it('uses Mock when Mock is selected even if a key exists', () => {
    expect(resolveConfiguredAIProvider('mock', 'user-key', 'env-key')).toEqual({
      provider: 'mock',
      openAIApiKey: '',
    });
  });
});
