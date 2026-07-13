import { describe, expect, it } from 'vitest';
import { createChoiceAIProvider } from './AIProviderFactory';
import { MockAIProvider } from './MockAIProvider';
import { OpenAIProvider } from './OpenAIProvider';

describe('choice AIProviderFactory', () => {
  it('uses OpenAIProvider when API key exists', async () => {
    await expect(createChoiceAIProvider('test-api-key')).resolves.toBeInstanceOf(OpenAIProvider);
  });

  it('falls back to MockAIProvider when API key is missing', async () => {
    await expect(createChoiceAIProvider('')).resolves.toBeInstanceOf(MockAIProvider);
  });
});
