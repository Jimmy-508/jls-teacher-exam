import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';

vi.mock('../services/userSettingsService', () => ({
  DEFAULT_DISPLAY_NAME: 'Jarvis',
  getUserSettings: vi.fn(async () => ({ displayName: 'Jarvis', aiProvider: 'mock', openAIApiKey: '' })),
  saveUserSettings: vi.fn(async () => undefined),
}));

vi.mock('../services/learningProgressResetService', () => ({
  resetLearningProgress: vi.fn(async () => undefined),
}));

vi.mock('../services/pwaService', () => ({
  applyPwaUpdate: vi.fn(async () => undefined),
  checkForPwaUpdate: vi.fn(async () => 'up-to-date'),
}));

describe('SettingsPage', () => {
  it('renders basic settings, app info, and no AI or API key controls', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('Settings');
    expect(html).toContain('value="Jarvis"');
    expect(html).toContain('placeholder="Jarvis"');
    expect(html).toContain('<details class="today-card about-jls-card">');
    expect(html).not.toContain('<details open');
    expect(html).toContain('Jarvis 教師資格考學習系統');
    expect(html).toContain('v4.3');
    expect(html).toContain('離線資源更新');
    expect(html).toContain('檢查更新');
    expect(html).not.toContain('OpenAI API Key');
    expect(html).not.toContain('Gemini');
    expect(html).not.toContain('Claude');
  });
});
