import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import { Subscription } from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';
import { GetSubscriptionStatus, type SubscriptionStatus } from './get-subscription-status';

class FakeClock implements Clock {
  constructor(private readonly todayValue: CalendarDateString) {}

  today(): CalendarDateString {
    return this.todayValue;
  }

  now(): number {
    return 0;
  }
}

class FakeSubscriptionRepository implements SubscriptionRepository {
  private readonly rows: Subscription[] = [];

  save(subscription: Subscription): void {
    this.rows.push(subscription);
  }

  findAll(): Subscription[] {
    return [...this.rows];
  }
}

function trial(): Subscription {
  return Subscription.createTrial({ id: 'sub-1', startDate: '2026-10-08', createdAt: 1 });
}

function paid(id: string, startDate: CalendarDateString, endDate: CalendarDateString): Subscription {
  return Subscription.hydrate({ id, type: 'PAID', startDate, endDate, createdAt: 1 });
}

function statusFor(input: {
  today: CalendarDateString;
  periods?: Subscription[];
}): SubscriptionStatus {
  const subscriptions = new FakeSubscriptionRepository();
  for (const period of input.periods ?? [trial()]) {
    subscriptions.save(period);
  }
  return new GetSubscriptionStatus({
    subscriptions,
    clock: new FakeClock(input.today),
  }).execute();
}

describe('GetSubscriptionStatus', () => {
  it('is ACTIVE on the trial start date', () => {
    const status = statusFor({ today: '2026-10-08' });

    expect(status.state).toBe('ACTIVE');
    expect(status.active).toBe(true);
    expect(status.type).toBe('TRIAL');
    expect(status.startDate).toBe('2026-10-08');
    expect(status.endDate).toBe('2026-11-06');
  });

  it('is ACTIVE on the trial end date (inclusive boundary)', () => {
    const status = statusFor({ today: '2026-11-06' });

    expect(status.state).toBe('ACTIVE');
    expect(status.active).toBe(true);
  });

  it('is EXPIRED the day after the end date', () => {
    const status = statusFor({ today: '2026-11-07' });

    expect(status.state).toBe('EXPIRED');
    expect(status.active).toBe(false);
    expect(status.endDate).toBe('2026-11-06');
  });

  it('is FUTURE before the period starts', () => {
    const status = statusFor({ today: '2026-10-07' });

    expect(status.state).toBe('FUTURE');
    expect(status.active).toBe(false);
    expect(status.startDate).toBe('2026-10-08');
  });

  it('is NONE when no subscription exists', () => {
    const status = statusFor({ today: '2026-10-08', periods: [] });

    expect(status.state).toBe('NONE');
    expect(status.active).toBe(false);
    expect(status.type).toBeNull();
    expect(status.startDate).toBeNull();
    expect(status.endDate).toBeNull();
  });

  it('derives the state from the injected Clock rather than machine time', () => {
    const status = statusFor({ today: '2099-01-01' });

    expect(status.today).toBe('2099-01-01');
    expect(status.state).toBe('EXPIRED');
    expect(status.active).toBe(false);
  });

  it('prefers an active paid period over the expired trial', () => {
    const status = statusFor({
      today: '2026-12-01',
      periods: [trial(), paid('sub-2', '2026-11-07', '2026-12-07')],
    });

    expect(status.state).toBe('ACTIVE');
    expect(status.type).toBe('PAID');
    expect(status.endDate).toBe('2026-12-07');
  });

  it('reports the most recent expired period when several have passed', () => {
    const status = statusFor({
      today: '2027-06-01',
      periods: [trial(), paid('sub-2', '2026-11-07', '2027-03-07'), paid('sub-3', '2027-03-08', '2027-05-08')],
    });

    expect(status.state).toBe('EXPIRED');
    expect(status.endDate).toBe('2027-05-08');
  });
});
