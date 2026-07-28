import type { ColorTheme, FeedbackColorScheme } from '../services/appearanceService';

export type AIAnalysisProviderType = 'mock' | 'openai' | 'ollama' | 'gemini';

export interface UserSettings {
  displayName: string;
  aiProvider?: AIAnalysisProviderType;
  openAIApiKey?: string;
  colorTheme?: ColorTheme;
  feedbackColorScheme?: FeedbackColorScheme;
}
