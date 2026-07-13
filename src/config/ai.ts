import { hasOpenAIApiKey } from './openai';
import type { AIProviderType } from '../ai/AIProviderFactory';

export const aiConfig: { provider: AIProviderType } = {
  provider: hasOpenAIApiKey() ? 'openai' : 'mock',
};

