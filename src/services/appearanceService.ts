export type ColorTheme = 'classic-green' | 'starry-blue' | 'tech-purple' | 'warm-sand' | 'sakura-pink' | 'graphite';
export type FeedbackColorScheme = 'standard' | 'colorblind-blue-orange';

export const DEFAULT_COLOR_THEME: ColorTheme = 'classic-green';
export const DEFAULT_FEEDBACK_COLOR_SCHEME: FeedbackColorScheme = 'standard';

export interface AppearanceSettings {
  colorTheme: ColorTheme;
  feedbackColorScheme: FeedbackColorScheme;
}

export const COLOR_THEME_OPTIONS: Array<{
  value: ColorTheme;
  label: string;
  swatches: string[];
}> = [
  { value: 'classic-green', label: '\u7d93\u5178\u7da0', swatches: ['#1c6758', '#155347', '#eef3f1', '#f5f7fa'] },
  { value: 'starry-blue', label: '\u661f\u591c\u85cd', swatches: ['#1f4e79', '#173b5c', '#eaf3fb', '#f4f8fb'] },
  { value: 'tech-purple', label: '\u79d1\u6280\u7d2b', swatches: ['#5b4b8a', '#43356a', '#f1ecfb', '#f7f5fb'] },
  { value: 'warm-sand', label: '\u6696\u6c99\u91d1', swatches: ['#8a6f3d', '#6f562d', '#f7efd9', '#fbf7ef'] },
  { value: 'sakura-pink', label: '\u6afb\u82b1\u7c89', swatches: ['#a85c73', '#85475c', '#f8e9ef', '#fbf6f8'] },
  { value: 'graphite', label: '\u77f3\u58a8\u7070', swatches: ['#3f4852', '#2f3740', '#edf0f2', '#f6f7f8'] },
];

export const FEEDBACK_COLOR_SCHEME_OPTIONS: Array<{
  value: FeedbackColorScheme;
  label: string;
  swatches: string[];
}> = [
  { value: 'standard', label: '\u6a19\u6e96\u7d05\u7da0', swatches: ['#2f855a', '#f0fff4', '#c53030', '#fff5f5'] },
  { value: 'colorblind-blue-orange', label: '\u8272\u5f31\u53cb\u5584\u85cd\u6a58', swatches: ['#2563a6', '#eff6ff', '#c05621', '#fff7ed'] },
];

const COLOR_THEME_VALUES = new Set<ColorTheme>(COLOR_THEME_OPTIONS.map((option) => option.value));
const FEEDBACK_COLOR_SCHEME_VALUES = new Set<FeedbackColorScheme>(FEEDBACK_COLOR_SCHEME_OPTIONS.map((option) => option.value));

export function normalizeColorTheme(value: unknown): ColorTheme {
  return typeof value === 'string' && COLOR_THEME_VALUES.has(value as ColorTheme) ? (value as ColorTheme) : DEFAULT_COLOR_THEME;
}

export function normalizeFeedbackColorScheme(value: unknown): FeedbackColorScheme {
  return typeof value === 'string' && FEEDBACK_COLOR_SCHEME_VALUES.has(value as FeedbackColorScheme)
    ? (value as FeedbackColorScheme)
    : DEFAULT_FEEDBACK_COLOR_SCHEME;
}

export function normalizeAppearanceSettings(value: Partial<AppearanceSettings> | undefined): AppearanceSettings {
  return {
    colorTheme: normalizeColorTheme(value?.colorTheme),
    feedbackColorScheme: normalizeFeedbackColorScheme(value?.feedbackColorScheme),
  };
}

export function applyAppearanceSettings(settings: Partial<AppearanceSettings> | undefined): void {
  if (typeof document === 'undefined') {
    return;
  }

  const normalizedSettings = normalizeAppearanceSettings(settings);
  document.documentElement.dataset.jlsTheme = normalizedSettings.colorTheme;
  document.documentElement.dataset.jlsFeedback = normalizedSettings.feedbackColorScheme;
}