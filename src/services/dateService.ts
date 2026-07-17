export function formatLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalDateLabel(dateString: string): string {
  const date = parseLocalDate(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function startOfLocalDay(dateString: string): Date {
  const date = parseLocalDate(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfLocalDay(dateString: string): Date {
  const date = parseLocalDate(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function isDateInInclusiveLocalRange(value: string | undefined, startDate: string, endDate: string): boolean {
  if (!value || !startDate || !endDate) {
    return false;
  }

  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) {
    return false;
  }

  return time >= startOfLocalDay(startDate).getTime() && time <= endOfLocalDay(endDate).getTime();
}

export function compareLocalDateRange(startDate: string, endDate: string): number {
  if (!startDate || !endDate) {
    return 0;
  }

  return startOfLocalDay(startDate).getTime() - startOfLocalDay(endDate).getTime();
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(value);
  }

  return new Date(year, month - 1, day);
}
