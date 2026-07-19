import { describe, expect, it } from 'vitest';
import { compareJlsSubjects, isChineseLanguageSubject, normalizeSubjectName, sortJlsSubjects } from './subjectOrder';

describe('subjectOrder', () => {
  it('sorts existing subjects by Traditional Chinese stroke order and keeps Chinese language last', () => {
    expect(
      sortJlsSubjects([
        '國語文能力測驗',
        '教育原理與制度',
        '青少年發展與輔導',
        '中等學校課程與教學',
      ]),
    ).toEqual(['中等學校課程與教學', '青少年發展與輔導', '教育原理與制度', '國語文能力測驗']);
  });

  it('deduplicates subjects, removes blanks, and places uncategorized before Chinese language', () => {
    expect(sortJlsSubjects(['國文科', '未分類科目', '教育原理與制度', ' ', '教育原理與制度'])).toEqual([
      '教育原理與制度',
      '未分類科目',
      '國文科',
    ]);
  });

  it('normalizes and deduplicates visually identical subject names', () => {
    expect(
      sortJlsSubjects([
        '教育原理與制度',
        '教育原理與制度\u200B',
        '\uFEFF教育原理與制度',
        ' 教育原理與制度 ',
        '教育原理與制度　',
      ]),
    ).toEqual(['教育原理與制度']);
  });

  it('normalizes invisible characters and blank subject names', () => {
    expect(normalizeSubjectName('')).toBe('未分類科目');
    expect(normalizeSubjectName(' \u200B ')).toBe('未分類科目');
    expect(normalizeSubjectName('教育  原理與制度')).toBe('教育 原理與制度');
    expect(normalizeSubjectName('教育原理與制度\u2060')).toBe('教育原理與制度');
  });

  it('detects Chinese language subject names by keyword', () => {
    expect(isChineseLanguageSubject('國語文能力測驗')).toBe(true);
    expect(isChineseLanguageSubject('國文科')).toBe(true);
    expect(isChineseLanguageSubject('教育原理與制度')).toBe(false);
  });

  it('uses the same compare function for array sorting', () => {
    expect(['國語文能力測驗', '中等學校課程與教學', '教育原理與制度'].sort(compareJlsSubjects)).toEqual([
      '中等學校課程與教學',
      '教育原理與制度',
      '國語文能力測驗',
    ]);
  });
});
