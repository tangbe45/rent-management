import {
  compareCalendarDates,
  formatCalendarDate,
  parseCalendarDate,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';
import { RENT_FREQUENCY_MONTHS, type RentFrequency } from './rental-agreement';

/**
 * Adds whole calendar months, clamping the day to the target month's last day.
 * Off-by-one occurrences are computed from the anchor, not from the previous
 * occurrence, so a series anchored on the 31st stays on the last day of shorter
 * months without drifting (Jan 31 -> Feb 28 -> Mar 31).
 */
export function addCalendarMonths(date: CalendarDateString, months: number): CalendarDateString {
  const parsed = parseCalendarDate(date);
  const targetIndex = parsed.getUTCMonth() + months;
  const targetYear = parsed.getUTCFullYear() + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(parsed.getUTCDate(), lastDay);
  return formatCalendarDate(new Date(Date.UTC(targetYear, targetMonth, targetDay)));
}

/**
 * All scheduled rent due dates from `anchor` up to and including `lastDate`.
 * `lastDate` is always finite here: callers pass the effective end date when one
 * exists, or a rolling horizon for open-ended agreements.
 */
export function calculateRentSchedule(
  anchor: CalendarDateString,
  frequency: RentFrequency,
  lastDate: CalendarDateString,
): CalendarDateString[] {
  const step = RENT_FREQUENCY_MONTHS[frequency];
  const dates: CalendarDateString[] = [];
  for (let index = 0; index < 1200; index += 1) {
    const dueDate = index === 0 ? anchor : addCalendarMonths(anchor, step * index);
    if (compareCalendarDates(dueDate, lastDate) > 0) {
      break;
    }
    dates.push(dueDate);
  }
  return dates;
}

/**
 * The first scheduled due date on or after `date`. Always returns a date: the
 * schedule is unbounded to the right, so an open-ended agreement always has a
 * next due date.
 */
export function firstRentDueDateOnOrAfter(
  anchor: CalendarDateString,
  frequency: RentFrequency,
  date: CalendarDateString,
): CalendarDateString {
  const step = RENT_FREQUENCY_MONTHS[frequency];
  for (let index = 0; index < 1200; index += 1) {
    const dueDate = index === 0 ? anchor : addCalendarMonths(anchor, step * index);
    if (compareCalendarDates(dueDate, date) >= 0) {
      return dueDate;
    }
  }
  return addCalendarMonths(anchor, step * 1200);
}
