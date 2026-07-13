import { describe, expect, it } from 'vitest';
import { hasOpenAIApiKey, normalizeOpenAIApiKey } from './openai';

describe('openAI config', () => {
  it('normalizes surrounding quotes and whitespace from API key', () => {
    expect(normalizeOpenAIApiKey(' "test-key" ')).toBe('test-key');
    expect(normalizeOpenAIApiKey(" 'test-key' ")).toBe('test-key');
  });

  it('treats normalized API key as enabled', () => {
    expect(hasOpenAIApiKey(' "test-key" ')).toBe(true);
    expect(hasOpenAIApiKey('   ')).toBe(false);
  });
});
