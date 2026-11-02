import {
  compareCalendarDates,
  isValidCalendarDate,
} from '../../../shared/domain/calendar-date';
import {
  InvalidSubscriptionDateError,
  InvalidSubscriptionPeriodError,
  SubscriptionPeriodOverlapError,
  type SubscriptionPeriod,
} from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';

/**
 * Validates a proposed subscription period before it may ever be persisted:
 * dates must be valid, the end cannot precede the start, and the period must
 * not overlap any existing period (sequential periods starting the day after
 * an existing end date are allowed). This is the boundary a future
 * subscription-purchase flow must call — no checkout or paid-period creation
 * exists yet, and this use case does not persist anything itself.
 */
export class ValidateSubscriptionPeriod {
  constructor(private readonly deps: { subscriptions: SubscriptionRepository }) {}

  execute(input: SubscriptionPeriod): void {
    if (!isValidCalendarDate(input.startDate)) {
      throw new InvalidSubscriptionDateError(input.startDate);
    }
    if (!isValidCalendarDate(input.endDate)) {
      throw new InvalidSubscriptionDateError(input.endDate);
    }
    if (compareCalendarDates(input.endDate, input.startDate) < 0) {
      throw new InvalidSubscriptionPeriodError(input.startDate, input.endDate);
    }
    for (const existing of this.deps.subscriptions.findAll()) {
      if (existing.overlaps(input)) {
        throw new SubscriptionPeriodOverlapError(input, existing);
      }
    }
  }
}
