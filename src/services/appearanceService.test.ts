import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_COLOR_THEME,
  DEFAULT_FEEDBACK_COLOR_SCHEME,
  applyAppearanceSettings,
  normalizeAppearanceSettings,
  normalizeColorTheme,
  normalizeFeedbackColorScheme,
} from './appearanceService';

describe('appearanceService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the default classic green theme and standard feedback scheme', () => {
    expect(normalizeAppearanceSettings(undefined)).toEqual({
      colorTheme: DEFAULT_COLOR_THEME,
      feedbackColorScheme: DEFAULT_FEEDBACK_COLOR_SCHEME,
    });
  });

  it('keeps valid theme and feedback choices', () => {
    expect(normalizeColorTheme('starry-blue')).toBe('starry-blue');
    expect(normalizeColorTheme('rainbow-candy')).toBe('rainbow-candy');
    expect(normalizeColorTheme('aurora')).toBe('aurora');
    expect(normalizeFeedbackColorScheme('colorblind-blue-orange')).toBe('colorblind-blue-orange');
  });

  it('falls back safely for legacy or invalid values', () => {
    expect(normalizeColorTheme('unknown')).toBe(DEFAULT_COLOR_THEME);
    expect(normalizeFeedbackColorScheme('unknown')).toBe(DEFAULT_FEEDBACK_COLOR_SCHEME);
    expect(normalizeAppearanceSettings({})).toEqual({
      colorTheme: DEFAULT_COLOR_THEME,
      feedbackColorScheme: DEFAULT_FEEDBACK_COLOR_SCHEME,
    });
  });

  it('applies normalized appearance settings to the document element', () => {
    const dataset: Record<string, string> = {};
    vi.stubGlobal('document', { documentElement: { dataset } });

    applyAppearanceSettings({ colorTheme: 'rainbow-candy', feedbackColorScheme: 'colorblind-blue-orange' });

    expect(dataset.jlsTheme).toBe('rainbow-candy');
    expect(dataset.jlsFeedback).toBe('colorblind-blue-orange');
  });

  it('applies the aurora theme to the document element', () => {
    const dataset: Record<string, string> = {};
    vi.stubGlobal('document', { documentElement: { dataset } });

    applyAppearanceSettings({ colorTheme: 'aurora', feedbackColorScheme: 'standard' });

    expect(dataset.jlsTheme).toBe('aurora');
    expect(dataset.jlsFeedback).toBe('standard');
  });
});
