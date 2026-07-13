import { load, save } from './storageService';
import type { UserSettings } from '../types/UserSettings';

export const USER_SETTINGS_STORAGE_KEY = 'jls.userSettings.v1';
export const DEFAULT_DISPLAY_NAME = 'Jarvis';

export async function getUserSettings(): Promise<UserSettings> {
  const settings = await load<UserSettings>(USER_SETTINGS_STORAGE_KEY);

  return {
    ...settings,
    displayName: normalizeDisplayName(settings?.displayName),
    aiProvider: settings?.aiProvider ?? 'mock',
    openAIApiKey: settings?.openAIApiKey?.trim() ?? '',
  };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await save<UserSettings>(USER_SETTINGS_STORAGE_KEY, {
    displayName: normalizeDisplayName(settings.displayName),
    aiProvider: settings.aiProvider ?? 'mock',
    openAIApiKey: settings.openAIApiKey?.trim() ?? '',
  });
}

export async function getDisplayName(): Promise<string> {
  const settings = await getUserSettings();
  return settings.displayName.trim() || DEFAULT_DISPLAY_NAME;
}

function normalizeDisplayName(value: string | undefined): string {
  return value?.trim() || DEFAULT_DISPLAY_NAME;
}
