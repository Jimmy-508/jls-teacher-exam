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

describe('SettingsPage', () => {
  it('renders basic settings without AI or API key controls', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('Settings');
    expect(html).toContain('value="Jarvis"');
    expect(html).toContain('placeholder="Jarvis"');
    expect(html).toContain('系統設定');
    expect(html).toContain('顯示名稱');
    expect(html).toContain('初始化學習進度');
    expect(html).toContain('關於 JLS');
    expect(html).toContain('<details class="today-card about-jls-card">');
    expect(html).not.toContain('<details open');
    expect(html).toContain('JLS（Jarvis Learning System）');
    expect(html).toContain('Jarvis 教檢隨身考');
    expect(html).toContain('v4.2');
    expect(html).toContain('免費、非官方的教師資格考試學習系統');
    expect(html).toContain('請定期使用 Library 的備份功能保存學習資料');
    expect(html).not.toContain('AI 分析引擎');
    expect(html).not.toContain('OpenAI API Key');
    expect(html).not.toContain('Gemini');
    expect(html).not.toContain('Claude');
  });
});
