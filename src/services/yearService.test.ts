import { describe, expect, it } from 'vitest';
import { buildExamYearOptions, compareExamYearsDescending, parseExamYear } from './yearService';

describe('yearService', () => {
  it('parses pure exam years and session exam years', () => {
    expect(parseExamYear('115')).toEqual({ year: 115, session: 0 });
    expect(parseExamYear('108-1')).toEqual({ year: 108, session: 1 });
    expect(parseExamYear('108-2')).toEqual({ year: 108, session: 2 });
    expect(parseExamYear(' 108-2 ')).toEqual({ year: 108, session: 2 });
  });

  it('returns null for invalid or empty exam year text', () => {
    expect(parseExamYear('')).toBeNull();
    expect(parseExamYear('  ')).toBeNull();
    expect(parseExamYear('unknown')).toBeNull();
    expect(parseExamYear('108-A')).toBeNull();
  });

  it('sorts valid exam years by main year then session descending', () => {
    expect(['94', '108-1', '115', '106', '108-2', '109'].sort(compareExamYearsDescending)).toEqual([
      '115',
      '109',
      '108-2',
      '108-1',
      '106',
      '94',
    ]);
  });

  it('builds unique non-empty exam year options without inventing missing years', () => {
    expect(buildExamYearOptions(['94', '108-1', '115', '106', '108-2', '109', '108-2', '', '  '])).toEqual([
      '115',
      '109',
      '108-2',
      '108-1',
      '106',
      '94',
    ]);
  });

  it('keeps invalid year values after valid years with stable natural text sorting', () => {
    expect(buildExamYearOptions(['alpha-2', '115', 'alpha-10', '108-1'])).toEqual([
      '115',
      '108-1',
      'alpha-2',
      'alpha-10',
    ]);
  });
});
