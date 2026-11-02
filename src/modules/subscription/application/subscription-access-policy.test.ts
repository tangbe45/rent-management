import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import { Subscription } from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';
import { SubscriptionExpiredError } from './errors';
import { GetSubscriptionStatus } from './get-subscription-status';
import { SubscriptionAccessPolicy } from './subscription-access-policy';

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

function policyFor(input: { today: CalendarDateString; noSubscription?: boolean }) {
  const subscriptions = new FakeSubscriptionRepository();
  if (!input.noSubscription) {
    subscriptions.save(
      Subscription.createTrial({ id: 'sub-1', startDate: '2026-10-08', createdAt: 1 }),
    );
  }
  const subscriptionStatus = new GetSubscriptionStatus({
    subscriptions,
    clock: new FakeClock(input.today),
  });
  return new SubscriptionAccessPolicy({ subscriptionStatus });
}

describe('SubscriptionAccessPolicy', () => {
  it('permits recording rental payments and generating receipts while active', () => {
    const policy = policyFor({ today: '2026-10-08' });

    expect(policy.canRecordRentalPayment()).toBe(true);
    expect(policy.canGenerateReceipt()).toBe(true);
    expect(() => policy.assertCanRecordRentalPayment()).not.toThrow();
    expect(() => policy.assertCanGenerateReceipt()).not.toThrow();
  });

  it('is active on the last included day of the trial', () => {
    const policy = policyFor({ today: '2026-11-06' });

    expect(policy.canRecordRentalPayment()).toBe(true);
    expect(policy.canGenerateReceipt()).toBe(true);
  });

  it('blocks both restricted operations once the injected Clock passes the end date', () => {
    const policy = policyFor({ today: '2026-11-07' });

    expect(policy.canRecordRentalPayment()).toBe(false);
    expect(policy.canGenerateReceipt()).toBe(false);
    expect(() => policy.assertCanRecordRentalPayment()).toThrow(SubscriptionExpiredError);
    expect(() => policy.assertCanGenerateReceipt()).toThrow(SubscriptionExpiredError);
  });

  it('explains the expired state without revealing credential details', () => {
    const policy = policyFor({ today: '2026-11-07' });

    expect(() => policy.assertCanRecordRentalPayment()).toThrow(/expired/);
    expect(() => policy.assertCanGenerateReceipt()).toThrow(/renewed/);
  });

  it('does not grant either restricted operation when no subscription exists', () => {
    const policy = policyFor({ today: '2026-10-08', noSubscription: true });

    expect(policy.canRecordRentalPayment()).toBe(false);
    expect(policy.canGenerateReceipt()).toBe(false);
  });

  it('does not grant access before a future period has started', () => {
    const policy = policyFor({ today: '2026-10-07' });

    expect(policy.canRecordRentalPayment()).toBe(false);
    expect(policy.canGenerateReceipt()).toBe(false);
  });
});