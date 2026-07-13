import { describe, expect, it, vi } from 'vitest';
import { load, save } from './storageService';
import { DEFAULT_DISPLAY_NAME, USER_SETTINGS_STORAGE_KEY, getUserSettings, saveUserSettings } from './userSettingsService';

vi.mock('./storageService', () => ({
  load: vi.fn(),
  save: vi.fn(async () => undefined),
}));

describe('userSettingsService', () => {
  it('uses Jarvis when no display name has been saved', async () => {
    vi.mocked(load).mockResolvedValue(null);

    await expect(getUserSettings()).resolves.toMatchObject({ displayName: DEFAULT_DISPLAY_NAME });
  });

  it('keeps a saved custom display name', async () => {
    vi.mocked(load).mockResolvedValue({ displayName: 'Sophia', aiProvider: 'mock', openAIApiKey: '' });

    await expect(getUserSettings()).resolves.toMatchObject({ displayName: 'Sophia' });
  });

  it('falls back to Jarvis when saved display name is blank', async () => {
    vi.mocked(load).mockResolvedValue({ displayName: '   ', aiProvider: 'mock', openAIApiKey: '' });

    await expect(getUserSettings()).resolves.toMatchObject({ displayName: DEFAULT_DISPLAY_NAME });
  });

  it('saves selected AI provider and OpenAI API key through StorageService', async () => {
    await saveUserSettings({
      displayName: 'Jimmy',
      aiProvider: 'openai',
      openAIApiKey: ' test-key ',
    });

    expect(vi.mocked(save)).toHaveBeenCalledWith(USER_SETTINGS_STORAGE_KEY, {
      displayName: 'Jimmy',
      aiProvider: 'openai',
      openAIApiKey: 'test-key',
    });
  });

  it('saves Jarvis instead of blank display names', async () => {
    await saveUserSettings({
      displayName: '   ',
      aiProvider: 'mock',
      openAIApiKey: '',
    });

    expect(vi.mocked(save)).toHaveBeenLastCalledWith(USER_SETTINGS_STORAGE_KEY, {
      displayName: DEFAULT_DISPLAY_NAME,
      aiProvider: 'mock',
      openAIApiKey: '',
    });
  });
});
