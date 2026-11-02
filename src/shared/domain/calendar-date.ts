export type CalendarDateString = string;

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarDate(value: string): Date {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) {
    throw new InvalidCalendarDateError(value);
  }
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime()) || formatCalendarDate(date) !== value) {
    throw new InvalidCalendarDateError(value);
  }
  return date;
}

export function formatCalendarDate(date: Date): CalendarDateString {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  try {
    parseCalendarDate(value);
    return true;
  } catch {
    return false;
  }
}

export function addCalendarDays(value: CalendarDateString, days: number): CalendarDateString {
  const date = parseCalendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

export function compareCalendarDates(a: CalendarDateString, b: CalendarDateString): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

export class InvalidCalendarDateError extends Error {
  constructor(value: string) {
    super(`Invalid calendar date: "${value}". Expected format YYYY-MM-DD.`);
    this.name = 'InvalidCalendarDateError';
  }
}