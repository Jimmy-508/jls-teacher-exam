import { describe, expect, it } from 'vitest';
import { getLearningThemeDisplayName } from './displayDictionary';

describe('displayDictionary', () => {
  it('maps LearningTheme aliases to official display names', () => {
    expect(getLearningThemeDisplayName('教原')).toBe('教育原理與制度');
    expect(getLearningThemeDisplayName(' 教育心理 ')).toBe('教育心理學與輔導');
    expect(getLearningThemeDisplayName('測驗')).toBe('教育測驗與評量');
    expect(getLearningThemeDisplayName('教育測驗')).toBe('教育測驗與評量');
    expect(getLearningThemeDisplayName('課程')).toBe('課程發展與設計');
    expect(getLearningThemeDisplayName('課程發展')).toBe('課程發展與設計');
  });

  it('keeps unmapped values unchanged and falls back when empty', () => {
    expect(getLearningThemeDisplayName('班級經營')).toBe('班級經營');
    expect(getLearningThemeDisplayName('')).toBe('未分類主題');
  });
});
