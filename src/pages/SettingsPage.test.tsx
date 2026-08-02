import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage, { AppearanceThemeCard } from './SettingsPage';

vi.mock('../services/userSettingsService', () => ({
  DEFAULT_DISPLAY_NAME: 'Jarvis',
  getUserSettings: vi.fn(async () => ({
    displayName: 'Jarvis',
    aiProvider: 'mock',
    openAIApiKey: '',
    colorTheme: 'classic-green',
    feedbackColorScheme: 'standard',
  })),
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
  it('renders basic settings, collapsed appearance settings, app info, and no AI or API key controls', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain('Settings');
    expect(html).toContain('value="Jarvis"');
    expect(html).toContain('placeholder="Jarvis"');
    expect(html).toContain('\u5132\u5b58\u986f\u793a\u540d\u7a31');
    expect(html).toContain('settings-display-name-label');
    expect(html).not.toContain('>\u5132\u5b58<');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('\u5916\u89c0\u4e3b\u984c');
    expect(html).not.toContain('\u9078\u64c7\u9069\u5408\u4f60\u7684 JLS \u914d\u8272');
    expect(html).not.toContain('\u5132\u5b58\u5916\u89c0\u8a2d\u5b9a');
    expect(html).toContain('<details class="today-card about-jls-card">');
    expect(html).not.toContain('<details open');
    expect(html).toContain('Jarvis Learning System');
    expect(html).toContain('v5.0');
    expect(html).not.toContain('OpenAI API Key');
    expect(html).not.toContain('Gemini');
    expect(html).not.toContain('Claude');
  });

  it('renders expanded appearance theme choices with independent actions and defaults selected', () => {
    const html = renderToStaticMarkup(
      <AppearanceThemeCard
        colorTheme="classic-green"
        feedbackColorScheme="standard"
        isOpen={true}
        onReset={() => undefined}
        onSave={() => undefined}
        onSelectColorTheme={() => undefined}
        onSelectFeedbackColorScheme={() => undefined}
        onToggle={() => undefined}
      />,
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('\u9078\u64c7\u9069\u5408\u4f60\u7684 JLS \u914d\u8272');
    expect(html).toContain('\u7d93\u5178\u7da0');
    expect(html).toContain('\u661f\u591c\u85cd');
    expect(html).toContain('\u79d1\u6280\u7d2b');
    expect(html).toContain('\u6696\u6c99\u91d1');
    expect(html).toContain('\u6afb\u82b1\u7c89');
    expect(html).toContain('\u77f3\u58a8\u7070');
    expect(html).toContain('\u5f69\u8679\u7cd6');
    expect(html).toContain('\u5317\u6975\u5149');
    expect(html).toContain('\u6a19\u6e96\u7d05\u7da0');
    expect(html).toContain('\u8272\u5f31\u53cb\u5584\u85cd\u6a58');
    expect(html).toContain('\u6062\u5fa9\u9810\u8a2d\u5916\u89c0');
    expect(html).not.toMatch(/>\u6062\u5fa9\u9810\u8a2d<\/button>/);
    expect(html).toContain('\u5132\u5b58\u5916\u89c0\u8a2d\u5b9a');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toContain('\u2713 \u5df2\u9078\u53d6');
    expect(html).toContain('background-color:#FF5A67');
    expect(html).toContain('background-color:#FFAE42');
    expect(html).toContain('background-color:#43C978');
    expect(html).toContain('background-color:#55A7FF');
    expect(html).not.toContain('background-color:#FFE066');
    expect(html).not.toContain('background-color:#9B6EF3');
  });

  it('marks rainbow candy as a selected appearance choice', () => {
    const html = renderToStaticMarkup(
      <AppearanceThemeCard
        colorTheme="rainbow-candy"
        feedbackColorScheme="colorblind-blue-orange"
        isOpen={true}
        onReset={() => undefined}
        onSave={() => undefined}
        onSelectColorTheme={() => undefined}
        onSelectFeedbackColorScheme={() => undefined}
        onToggle={() => undefined}
      />,
    );

    expect(html).toContain('\u5f69\u8679\u7cd6');
    expect(html).toContain('\u8272\u5f31\u53cb\u5584\u85cd\u6a58');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html.match(/\u2713 \u5df2\u9078\u53d6/g)).toHaveLength(10);
  });

  it('marks aurora as a selected appearance choice', () => {
    const html = renderToStaticMarkup(
      <AppearanceThemeCard
        colorTheme="aurora"
        feedbackColorScheme="standard"
        isOpen={true}
        onReset={() => undefined}
        onSave={() => undefined}
        onSelectColorTheme={() => undefined}
        onSelectFeedbackColorScheme={() => undefined}
        onToggle={() => undefined}
      />,
    );

    expect(html).toContain('\u5317\u6975\u5149');
    expect(html).toContain('\u6a19\u6e96\u7d05\u7da0');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
  });
});
