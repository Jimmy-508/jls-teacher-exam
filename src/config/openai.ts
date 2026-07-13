export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 900;

export const openAIConfig: OpenAIConfig = {
  apiKey: getOpenAIApiKey(),
  model: import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL,
  temperature: Number(import.meta.env.VITE_OPENAI_TEMPERATURE) || DEFAULT_TEMPERATURE,
  maxTokens: Number(import.meta.env.VITE_OPENAI_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
};

export function getOpenAIApiKey(): string {
  return normalizeOpenAIApiKey(import.meta.env.VITE_OPENAI_API_KEY);
}

export function hasOpenAIApiKey(apiKey = getOpenAIApiKey()): boolean {
  return normalizeOpenAIApiKey(apiKey).length > 0;
}

export function normalizeOpenAIApiKey(apiKey: string | undefined): string {
  return (apiKey ?? '').trim().replace(/^['"]|['"]$/g, '');
}
