import { addCalendarDays } from '../../../shared/domain/calendar-date';
import { Subscription, TRIAL_DURATION_DAYS } from './subscription';

function trial(startDate: string): Subscription {
  return Subscription.createTrial({ id: `trial-${startDate}`, startDate, createdAt: 1000 });
}

describe('Subscription', () => {
  it('creates a trial spanning exactly 30 inclusive calendar days', () => {
    const subscription = trial('2026-10-08');

    expect(subscription.type).toBe('TRIAL');
    expect(subscription.startDate).toBe('2026-10-08');
    expect(subscription.endDate).toBe('2026-11-06');
    expect(TRIAL_DURATION_DAYS).toBe(30);
  });

  it('covers its start date, its end date, and every day between — 30 days in total', () => {
    const subscription = trial('2026-10-08');

    for (let day = 0; day < TRIAL_DURATION_DAYS; day += 1) {
      expect(subscription.covers(addCalendarDays('2026-10-08', day))).toBe(true);
    }
    expect(subscription.covers(addCalendarDays('2026-10-08', TRIAL_DURATION_DAYS))).toBe(false);
  });

  it('counts correctly across a leap-year February boundary', () => {
    const subscription = trial('2028-02-01');

    expect(subscription.endDate).toBe('2028-03-01');
    expect(subscription.covers('2028-02-29')).toBe(true);
    expect(subscription.covers('2028-03-01')).toBe(true);
    expect(subscription.covers('2028-03-02')).toBe(false);
  });

  it('counts correctly across a month and year boundary', () => {
    const subscription = trial('2026-12-03');

    expect(subscription.endDate).toBe('2027-01-01');
    expect(subscription.covers('2026-12-31')).toBe(true);
    expect(subscription.covers('2027-01-01')).toBe(true);
    expect(subscription.covers('2027-01-02')).toBe(false);
  });

  it('rejects an invalid start date', () => {
    expect(() => trial('not-a-date')).toThrow(/Invalid subscription date/);
  });

  it('hydrates a persisted subscription', () => {
    const subscription = Subscription.hydrate({
      id: 'sub-1',
      type: 'TRIAL',
      startDate: '2026-10-08',
      endDate: '2026-11-06',
      createdAt: 1000,
    });
    expect(subscription.covers('2026-10-08')).toBe(true);
  });

  it('rejects a hydrated period whose end precedes its start', () => {
    expect(() =>
      Subscription.hydrate({
        id: 'sub-1',
        type: 'TRIAL',
        startDate: '2026-11-06',
        endDate: '2026-10-08',
        createdAt: 1000,
      }),
    ).toThrow(/Invalid subscription period/);
  });
});

describe('Subscription overlap rule', () => {
  const existing = trial('2026-10-08');

  it.each([
    ['an identical period', { startDate: '2026-10-08', endDate: '2026-11-06' }],
    ['a period sharing the start date', { startDate: '2026-10-08', endDate: '2026-10-20' }],
    ['a period starting before and ending inside', { startDate: '2026-10-01', endDate: '2026-10-10' }],
    ['a period starting inside and ending after', { startDate: '2026-11-01', endDate: '2026-12-01' }],
    ['a period fully contained inside', { startDate: '2026-10-10', endDate: '2026-10-20' }],
  ])('detects overlap with %s', (_label, period) => {
    expect(existing.overlaps(period)).toBe(true);
  });

  it.each([
    ['a sequential period starting the day after the end', { startDate: '2026-11-07', endDate: '2026-12-07' }],
    ['a period ending the day before the start', { startDate: '2026-09-01', endDate: '2026-10-07' }],
  ])('allows %s', (_label, period) => {
    expect(existing.overlaps(period)).toBe(false);
  });
});
