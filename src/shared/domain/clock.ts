import type { CalendarDateString } from './calendar-date';

export interface Clock {
  today(): CalendarDateString;
  now(): number;
}