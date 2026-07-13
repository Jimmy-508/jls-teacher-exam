import type { AIProvider } from './AIProvider';
import { hasOpenAIApiKey } from '../config/openai';
import { getConfiguredAIProvider } from '../services/openAIKeyService';
import { MockAIProvider } from './providers/MockAIProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';

export type AIProviderType = 'mock' | 'openai' | 'ollama' | 'gemini';

interface ProviderFactoryOptions {
  apiKey?: string;
}

export async function createProvider(type?: AIProviderType, options: ProviderFactoryOptions = {}): Promise<AIProvider> {
  const configuredProvider = await getConfiguredAIProvider();
  const resolvedApiKey = options.apiKey ?? configuredProvider.openAIApiKey;
  const requestedType =
    type ?? (options.apiKey !== undefined ? (hasOpenAIApiKey(resolvedApiKey) ? 'openai' : 'mock') : configuredProvider.provider);

  if (requestedType === 'mock') {
    return new MockAIProvider(configuredProvider.fallbackReason);
  }

  if (requestedType === 'openai') {
    return hasOpenAIApiKey(resolvedApiKey)
      ? new OpenAIProvider({ apiKey: resolvedApiKey })
      : new MockAIProvider(configuredProvider.fallbackReason);
  }

  throw new Error(`${requestedType} provider is not implemented yet.`);
}
