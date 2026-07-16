export const CHINESE_LANGUAGE_SUBJECT_NAMES = ['國語文能力測驗', '國文科'] as const;
export const UNCATEGORIZED_SUBJECT = '未分類科目';

const strokeCollator = new Intl.Collator('zh-Hant-TW-u-co-stroke', {
  usage: 'sort',
  sensitivity: 'base',
  numeric: true,
});

export function compareJlsSubjects(left: string, right: string): number {
  const normalizedLeft = normalizeSubjectName(left);
  const normalizedRight = normalizeSubjectName(right);

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  const leftRank = getSpecialSubjectRank(normalizedLeft);
  const rightRank = getSpecialSubjectRank(normalizedRight);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return strokeCollator.compare(normalizedLeft, normalizedRight);
}

export function sortJlsSubjects(subjects: readonly string[]): string[] {
  return Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean))).sort(compareJlsSubjects);
}

export const TEACHER_EXAM_SUBJECT_ORDER = CHINESE_LANGUAGE_SUBJECT_NAMES;
export const compareTeacherExamSubjects = compareJlsSubjects;
export const sortTeacherExamSubjects = sortJlsSubjects;

function normalizeSubjectName(value: string): string {
  return value.trim() || UNCATEGORIZED_SUBJECT;
}

function getSpecialSubjectRank(value: string): number {
  if (CHINESE_LANGUAGE_SUBJECT_NAMES.includes(value as (typeof CHINESE_LANGUAGE_SUBJECT_NAMES)[number])) {
    return 2;
  }

  if (value === UNCATEGORIZED_SUBJECT) {
    return 1;
  }

  return 0;
}
