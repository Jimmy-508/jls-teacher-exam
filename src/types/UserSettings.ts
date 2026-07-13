export type AIAnalysisProviderType = 'mock' | 'openai' | 'ollama' | 'gemini';

export interface UserSettings {
  displayName: string;
  aiProvider?: AIAnalysisProviderType;
  openAIApiKey?: string;
}
