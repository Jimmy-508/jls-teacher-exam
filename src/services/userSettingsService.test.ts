import { describe, expect, it, vi } from 'vitest';
import { load, save } from './storageService';
import { DEFAULT_DISPLAY_NAME, USER_SETTINGS_STORAGE_KEY, getUserSettings, saveUserSettings } from './userSettingsService';

vi.mock('./storageService', () => ({
  load: vi.fn(),
  save: vi.fn(async () => undefined),
}));

describe('userSettingsService', () => {
  it('uses Jarvis and default appearance when no settings have been saved', async () => {
    vi.mocked(load).mockResolvedValue(null);

    await expect(getUserSettings()).resolves.toMatchObject({
      displayName: DEFAULT_DISPLAY_NAME,
      colorTheme: 'classic-green',
      feedbackColorScheme: 'standard',
    });
  });

  it('keeps a saved custom display name and appearance settings', async () => {
    vi.mocked(load).mockResolvedValue({
      displayName: 'Sophia',
      aiProvider: 'mock',
      openAIApiKey: '',
      colorTheme: 'starry-blue',
      feedbackColorScheme: 'colorblind-blue-orange',
    });

    await expect(getUserSettings()).resolves.toMatchObject({
      displayName: 'Sophia',
      colorTheme: 'starry-blue',
      feedbackColorScheme: 'colorblind-blue-orange',
    });
  });

  it('falls back to Jarvis and default appearance for legacy settings', async () => {
    vi.mocked(load).mockResolvedValue({ displayName: '   ', aiProvider: 'mock', openAIApiKey: '' });

    await expect(getUserSettings()).resolves.toMatchObject({
      displayName: DEFAULT_DISPLAY_NAME,
      colorTheme: 'classic-green',
      feedbackColorScheme: 'standard',
    });
  });

  it('saves selected provider, API key, and appearance settings through StorageService', async () => {
    await saveUserSettings({
      displayName: 'Jimmy',
      aiProvider: 'openai',
      openAIApiKey: ' test-key ',
      colorTheme: 'tech-purple',
      feedbackColorScheme: 'colorblind-blue-orange',
    });

    expect(vi.mocked(save)).toHaveBeenCalledWith(USER_SETTINGS_STORAGE_KEY, {
      displayName: 'Jimmy',
      aiProvider: 'openai',
      openAIApiKey: 'test-key',
      colorTheme: 'tech-purple',
      feedbackColorScheme: 'colorblind-blue-orange',
    });
  });

  it('can save a display-name change while preserving saved appearance fields', async () => {
    await saveUserSettings({
      displayName: 'Jimmy',
      aiProvider: 'mock',
      openAIApiKey: '',
      colorTheme: 'warm-sand',
      feedbackColorScheme: 'colorblind-blue-orange',
    });

    expect(vi.mocked(save)).toHaveBeenLastCalledWith(USER_SETTINGS_STORAGE_KEY, {
      displayName: 'Jimmy',
      aiProvider: 'mock',
      openAIApiKey: '',
      colorTheme: 'warm-sand',
      feedbackColorScheme: 'colorblind-blue-orange',
    });
  });

  it('can save an appearance change while preserving the saved display name', async () => {
    await saveUserSettings({
      displayName: 'Sophia',
      aiProvider: 'mock',
      openAIApiKey: '',
      colorTheme: 'sakura-pink',
      feedbackColorScheme: 'standard',
    });

    expect(vi.mocked(save)).toHaveBeenLastCalledWith(USER_SETTINGS_STORAGE_KEY, {
      displayName: 'Sophia',
      aiProvider: 'mock',
      openAIApiKey: '',
      colorTheme: 'sakura-pink',
      feedbackColorScheme: 'standard',
    });
  });

  it('saves Jarvis and default appearance instead of blank or invalid settings', async () => {
    await saveUserSettings({
      displayName: '   ',
      aiProvider: 'mock',
      openAIApiKey: '',
      colorTheme: 'not-real' as never,
      feedbackColorScheme: 'not-real' as never,
    });

    expect(vi.mocked(save)).toHaveBeenLastCalledWith(USER_SETTINGS_STORAGE_KEY, {
      displayName: DEFAULT_DISPLAY_NAME,
      aiProvider: 'mock',
      openAIApiKey: '',
      colorTheme: 'classic-green',
      feedbackColorScheme: 'standard',
    });
  });
});
