export const TEACHER_EXAM_SUBJECT_ORDER = [
  '教育理念與實務',
  '課程教學與評量',
  '學習者發展與適性輔導',
  '國語文能力測驗',
] as const;

const UNCATEGORIZED_SUBJECT = '未分類科目';

export function compareTeacherExamSubjects(left: string, right: string): number {
  const normalizedLeft = left.trim() || UNCATEGORIZED_SUBJECT;
  const normalizedRight = right.trim() || UNCATEGORIZED_SUBJECT;

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  if (normalizedLeft === UNCATEGORIZED_SUBJECT) {
    return 1;
  }

  if (normalizedRight === UNCATEGORIZED_SUBJECT) {
    return -1;
  }

  const leftIndex = TEACHER_EXAM_SUBJECT_ORDER.indexOf(
    normalizedLeft as (typeof TEACHER_EXAM_SUBJECT_ORDER)[number],
  );
  const rightIndex = TEACHER_EXAM_SUBJECT_ORDER.indexOf(
    normalizedRight as (typeof TEACHER_EXAM_SUBJECT_ORDER)[number],
  );

  if (leftIndex >= 0 || rightIndex >= 0) {
    if (leftIndex < 0) {
      return 1;
    }

    if (rightIndex < 0) {
      return -1;
    }

    return leftIndex - rightIndex;
  }

  return normalizedLeft.localeCompare(normalizedRight, 'zh-Hant', { numeric: true, sensitivity: 'base' });
}

export function sortTeacherExamSubjects(subjects: readonly string[]): string[] {
  return Array.from(new Set(subjects.map((subject) => subject.trim()).filter(Boolean))).sort(compareTeacherExamSubjects);
}
