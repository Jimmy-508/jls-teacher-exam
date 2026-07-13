import { getOpenAIApiKey, normalizeOpenAIApiKey } from '../config/openai';
import type { AIAnalysisProviderType } from '../types/UserSettings';
import { getUserSettings } from './userSettingsService';

export const OPENAI_MISSING_KEY_FALLBACK_REASON = '尚未設定 OpenAI API Key，已改用 Mock 分析。';

export interface ConfiguredAIProvider {
  provider: 'mock' | 'openai';
  openAIApiKey: string;
  fallbackReason?: string;
}

export async function getConfiguredOpenAIApiKey(): Promise<string> {
  try {
    const settings = await getUserSettings();
    const runtimeApiKey = normalizeOpenAIApiKey(settings.openAIApiKey);

    return runtimeApiKey || getOpenAIApiKey();
  } catch {
    return getOpenAIApiKey();
  }
}

export async function getConfiguredAIProvider(): Promise<ConfiguredAIProvider> {
  try {
    const settings = await getUserSettings();
    const selectedProvider = settings.aiProvider ?? 'mock';

    return resolveConfiguredAIProvider(selectedProvider, settings.openAIApiKey);
  } catch {
    const envApiKey = getOpenAIApiKey();
    return envApiKey ? { provider: 'openai', openAIApiKey: envApiKey } : { provider: 'mock', openAIApiKey: '' };
  }
}

export function resolveConfiguredAIProvider(
  selectedProvider: AIAnalysisProviderType,
  userOpenAIApiKey: string | undefined,
  envOpenAIApiKey = getOpenAIApiKey(),
): ConfiguredAIProvider {
  if (selectedProvider !== 'openai') {
    return { provider: 'mock', openAIApiKey: '' };
  }

  const userApiKey = normalizeOpenAIApiKey(userOpenAIApiKey);
  const envApiKey = normalizeOpenAIApiKey(envOpenAIApiKey);
  const openAIApiKey = userApiKey || envApiKey;

  if (!openAIApiKey) {
    return {
      provider: 'mock',
      openAIApiKey: '',
      fallbackReason: OPENAI_MISSING_KEY_FALLBACK_REASON,
    };
  }

  return { provider: 'openai', openAIApiKey };
}
