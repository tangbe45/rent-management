import {
  addCalendarDays,
  compareCalendarDates,
  isValidCalendarDate,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';

export const TRIAL_DURATION_DAYS = 30;

export type SubscriptionType = 'TRIAL' | 'PAID';

export interface SubscriptionData {
  id: string;
  type: SubscriptionType;
  startDate: CalendarDateString;
  endDate: CalendarDateString;
  createdAt: number;
}

export class Subscription {
  private constructor(
    readonly id: string,
    readonly type: SubscriptionType,
    readonly startDate: CalendarDateString,
    readonly endDate: CalendarDateString,
    readonly createdAt: number,
  ) {}

  static createTrial(input: { id: string; startDate: CalendarDateString; createdAt: number }): Subscription {
    if (!isValidCalendarDate(input.startDate)) {
      throw new InvalidSubscriptionDateError(input.startDate);
    }
    const endDate = addCalendarDays(input.startDate, TRIAL_DURATION_DAYS - 1);
    return new Subscription(input.id, 'TRIAL', input.startDate, endDate, input.createdAt);
  }

  static hydrate(data: SubscriptionData): Subscription {
    if (!isValidCalendarDate(data.startDate) || !isValidCalendarDate(data.endDate)) {
      throw new InvalidSubscriptionDateError(`startDate=${data.startDate} endDate=${data.endDate}`);
    }
    if (compareCalendarDates(data.endDate, data.startDate) < 0) {
      throw new InvalidSubscriptionPeriodError(data.startDate, data.endDate);
    }
    return new Subscription(data.id, data.type, data.startDate, data.endDate, data.createdAt);
  }

  covers(date: CalendarDateString): boolean {
    return compareCalendarDates(this.startDate, date) <= 0 && compareCalendarDates(date, this.endDate) <= 0;
  }

  overlaps(period: SubscriptionPeriod): boolean {
    return (
      compareCalendarDates(this.startDate, period.endDate) <= 0 &&
      compareCalendarDates(period.startDate, this.endDate) <= 0
    );
  }
}

export interface SubscriptionPeriod {
  startDate: CalendarDateString;
  endDate: CalendarDateString;
}

export class InvalidSubscriptionDateError extends Error {
  constructor(value: string) {
    super(`Invalid subscription date: "${value}". Expected format YYYY-MM-DD.`);
    this.name = 'InvalidSubscriptionDateError';
  }
}

export class InvalidSubscriptionPeriodError extends Error {
  constructor(startDate: string, endDate: string) {
    super(`Invalid subscription period: endDate "${endDate}" is before startDate "${startDate}".`);
    this.name = 'InvalidSubscriptionPeriodError';
  }
}

export class SubscriptionPeriodOverlapError extends Error {
  constructor(period: SubscriptionPeriod, existing: Subscription) {
    super(
      `Subscription periods must not overlap: proposed ${period.startDate} to ${period.endDate} overlaps ${existing.startDate} to ${existing.endDate}.`,
    );
    this.name = 'SubscriptionPeriodOverlapError';
  }
}