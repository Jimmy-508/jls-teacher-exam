import { hasOpenAIApiKey } from '../../config/openai';
import { getConfiguredAIProvider } from '../openAIKeyService';
import type { AIProvider } from './AIProvider';
import { MockAIProvider } from './MockAIProvider';
import { OpenAIProvider } from './OpenAIProvider';

export async function createChoiceAIProvider(apiKey?: string): Promise<AIProvider> {
  if (typeof apiKey === 'string') {
    return hasOpenAIApiKey(apiKey) ? new OpenAIProvider({ apiKey }) : new MockAIProvider();
  }

  const config = await getConfiguredAIProvider();
  return config.provider === 'openai'
    ? new OpenAIProvider({ apiKey: config.openAIApiKey })
    : new MockAIProvider(config.fallbackReason);
}
