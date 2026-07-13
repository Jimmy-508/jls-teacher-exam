const LEARNING_THEME_DISPLAY_DICTIONARY: Record<string, string> = {
  教原: '教育原理與制度',
  教育原理: '教育原理與制度',
  教育原理與制度: '教育原理與制度',
  教心: '教育心理學與輔導',
  教育心理: '教育心理學與輔導',
  教育心理學: '教育心理學與輔導',
  教育心理學與輔導: '教育心理學與輔導',
  測驗: '教育測驗與評量',
  教育測驗: '教育測驗與評量',
  教育測驗與評量: '教育測驗與評量',
  課程: '課程發展與設計',
  課程發展: '課程發展與設計',
  課程發展與設計: '課程發展與設計',
};

export function getLearningThemeDisplayName(value: string): string {
  const normalizedValue = normalizeDisplayDictionaryKey(value);

  if (!normalizedValue) {
    return '未分類主題';
  }

  return LEARNING_THEME_DISPLAY_DICTIONARY[normalizedValue] ?? value.trim();
}

export function normalizeDisplayDictionaryKey(value: string): string {
  return value.trim().replace(/\s+/g, '');
}
