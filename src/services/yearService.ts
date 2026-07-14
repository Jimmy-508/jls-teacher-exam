export interface ParsedExamYear {
  year: number;
  session: number;
}

const PURE_YEAR_PATTERN = /^\d+$/;
const SESSION_YEAR_PATTERN = /^(\d+)-(\d+)$/;

const naturalTextCollator = new Intl.Collator('zh-Hant', {
  numeric: true,
  sensitivity: 'base',
});

export function parseExamYear(value: string): ParsedExamYear | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (PURE_YEAR_PATTERN.test(normalizedValue)) {
    return {
      year: Number(normalizedValue),
      session: 0,
    };
  }

  const sessionMatch = normalizedValue.match(SESSION_YEAR_PATTERN);

  if (sessionMatch) {
    return {
      year: Number(sessionMatch[1]),
      session: Number(sessionMatch[2]),
    };
  }

  return null;
}

export function compareExamYearsDescending(left: string, right: string): number {
  const leftValue = left.trim();
  const rightValue = right.trim();
  const leftParsed = parseExamYear(leftValue);
  const rightParsed = parseExamYear(rightValue);

  if (leftParsed && rightParsed) {
    if (leftParsed.year !== rightParsed.year) {
      return rightParsed.year - leftParsed.year;
    }

    return rightParsed.session - leftParsed.session;
  }

  if (leftParsed) {
    return -1;
  }

  if (rightParsed) {
    return 1;
  }

  return naturalTextCollator.compare(leftValue, rightValue);
}

export function buildExamYearOptions(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort(compareExamYearsDescending);
}
