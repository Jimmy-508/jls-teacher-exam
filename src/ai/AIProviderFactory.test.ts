import { describe, expect, it } from 'vitest';
import { createProvider } from './AIProviderFactory';
import { MockAIProvider } from './providers/MockAIProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';

describe('AIProviderFactory', () => {
  it('returns Mock provider when API key is missing', async () => {
    await expect(createProvider(undefined, { apiKey: '' })).resolves.toBeInstanceOf(MockAIProvider);
  });

  it('switches to OpenAI provider when API key exists', async () => {
    await expect(createProvider(undefined, { apiKey: 'test-key' })).resolves.toBeInstanceOf(OpenAIProvider);
  });

  it('falls back to Mock provider when openai is requested without API key', async () => {
    await expect(createProvider('openai', { apiKey: '' })).resolves.toBeInstanceOf(MockAIProvider);
  });
});
