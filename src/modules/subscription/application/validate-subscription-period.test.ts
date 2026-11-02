import {
  InvalidSubscriptionDateError,
  InvalidSubscriptionPeriodError,
  Subscription,
  SubscriptionPeriodOverlapError,
} from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';
import { ValidateSubscriptionPeriod } from './validate-subscription-period';

class FakeSubscriptionRepository implements SubscriptionRepository {
  private readonly rows: Subscription[] = [];

  save(subscription: Subscription): void {
    this.rows.push(subscription);
  }

  findAll(): Subscription[] {
    return [...this.rows];
  }
}

function build(existing: Subscription[] = []) {
  const subscriptions = new FakeSubscriptionRepository();
  for (const subscription of existing) {
    subscriptions.save(subscription);
  }
  return new ValidateSubscriptionPeriod({ subscriptions });
}

const trial = Subscription.createTrial({ id: 'sub-1', startDate: '2026-10-08', createdAt: 1 });

describe('ValidateSubscriptionPeriod', () => {
  it.each([
    ['an identical period', { startDate: '2026-10-08', endDate: '2026-11-06' }],
    ['a partial overlap from the left', { startDate: '2026-10-01', endDate: '2026-10-10' }],
    ['a partial overlap from the right', { startDate: '2026-11-01', endDate: '2026-12-01' }],
    ['a contained period', { startDate: '2026-10-10', endDate: '2026-10-20' }],
  ])('rejects %s that overlaps an existing period', (_label, period) => {
    expect(() => build([trial]).execute(period)).toThrow(SubscriptionPeriodOverlapError);
  });

  it('allows a sequential period starting the day after the existing end date', () => {
    expect(() =>
      build([trial]).execute({ startDate: '2026-11-07', endDate: '2026-12-06' }),
    ).not.toThrow();
  });

  it('allows a non-overlapping period before the existing one and one far in the future', () => {
    const validate = build([trial]);
    expect(() => validate.execute({ startDate: '2026-09-01', endDate: '2026-10-07' })).not.toThrow();
    expect(() => validate.execute({ startDate: '2027-01-01', endDate: '2027-02-01' })).not.toThrow();
  });

  it('allows any valid period when nothing is persisted yet', () => {
    expect(() =>
      build().execute({ startDate: '2026-10-08', endDate: '2026-11-06' }),
    ).not.toThrow();
  });

  it('rejects a period whose end precedes its start', () => {
    expect(() =>
      build().execute({ startDate: '2026-11-06', endDate: '2026-10-08' }),
    ).toThrow(InvalidSubscriptionPeriodError);
  });

  it('rejects malformed dates', () => {
    expect(() =>
      build().execute({ startDate: 'not-a-date', endDate: '2026-11-06' }),
    ).toThrow(InvalidSubscriptionDateError);
    expect(() =>
      build().execute({ startDate: '2026-10-08', endDate: '2026-13-40' }),
    ).toThrow(InvalidSubscriptionDateError);
  });
});