import {
  compareCalendarDates,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { Subscription, SubscriptionType } from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';

export type SubscriptionState = 'ACTIVE' | 'EXPIRED' | 'FUTURE' | 'NONE';

export interface SubscriptionStatus {
  state: SubscriptionState;
  active: boolean;
  today: CalendarDateString;
  type: SubscriptionType | null;
  startDate: CalendarDateString | null;
  endDate: CalendarDateString | null;
}

function toStatus(
  state: SubscriptionState,
  subscription: Subscription | null,
  today: CalendarDateString,
): SubscriptionStatus {
  return {
    state,
    active: state === 'ACTIVE',
    today,
    type: subscription?.type ?? null,
    startDate: subscription?.startDate ?? null,
    endDate: subscription?.endDate ?? null,
  };
}

/**
 * Derives the landlord's entitlement purely from calendar dates and the
 * injected `Clock` — no stored status exists anywhere. ACTIVE means a period
 * covers today (inclusive boundaries); EXPIRED means only past periods remain;
 * FUTURE means the next period has not started; NONE means no period exists.
 */
export class GetSubscriptionStatus {
  constructor(
    private readonly deps: {
      subscriptions: SubscriptionRepository;
      clock: Clock;
    },
  ) {}

  execute(): SubscriptionStatus {
    const today = this.deps.clock.today();
    const periods = this.deps.subscriptions.findAll();

    for (const period of periods) {
      if (period.covers(today)) {
        return toStatus('ACTIVE', period, today);
      }
    }

    let latestExpired: Subscription | null = null;
    let earliestFuture: Subscription | null = null;
    for (const period of periods) {
      if (compareCalendarDates(period.endDate, today) < 0) {
        if (
          latestExpired === null ||
          compareCalendarDates(period.endDate, latestExpired.endDate) > 0
        ) {
          latestExpired = period;
        }
      } else if (compareCalendarDates(period.startDate, today) > 0) {
        if (
          earliestFuture === null ||
          compareCalendarDates(period.startDate, earliestFuture.startDate) < 0
        ) {
          earliestFuture = period;
        }
      }
    }

    if (latestExpired !== null) {
      return toStatus('EXPIRED', latestExpired, today);
    }
    if (earliestFuture !== null) {
      return toStatus('FUTURE', earliestFuture, today);
    }
    return toStatus('NONE', null, today);
  }
}
