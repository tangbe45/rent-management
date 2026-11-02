import { RentalAgreementNotFoundError } from './rental-agreement-errors';
import { GetRentSchedule } from './get-rent-schedule';
import {
  agreementAt,
  FakeRentalAgreementClock,
  InMemoryRentalAgreementRepository,
} from './test-support';

function build() {
  const agreements = new InMemoryRentalAgreementRepository();
  const clock = new FakeRentalAgreementClock(1, '2026-02-15');
  const schedule = new GetRentSchedule({ agreements, clock });
  return { agreements, schedule };
}

describe('GetRentSchedule', () => {
  it('projects a bounded schedule and next due date for an open-ended agreement', () => {
    const { agreements, schedule } = build();
    agreements.save(
      agreementAt({ id: 'a1', startDate: '2026-01-31', firstRentDueDate: '2026-01-31', rentFrequency: 'MONTHLY' }),
    );

    const view = schedule.execute('a1');

    expect(view.dueDates[0]).toBe('2026-01-31');
    expect(view.dueDates[1]).toBe('2026-02-28');
    expect(view.nextDueDate).toBe('2026-02-28');
    expect(view.dueDates.at(-1)).toBe('2027-01-31');
  });

  it('stops at the effective end date and reports no next due date past it', () => {
    const { agreements, schedule } = build();
    agreements.save(
      agreementAt({
        id: 'a1',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        firstRentDueDate: '2026-01-01',
      }),
    );

    const view = schedule.execute('a1');

    expect(view.dueDates).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(view.nextDueDate).toBe('2026-03-01');
  });

  it('uses the termination date as the effective end', () => {
    const { agreements, schedule } = build();
    agreements.save(
      agreementAt({
        id: 'a1',
        startDate: '2026-01-01',
        firstRentDueDate: '2026-01-01',
        terminationDate: '2026-02-10',
      }),
    );

    const view = schedule.execute('a1');

    expect(view.dueDates).toEqual(['2026-01-01', '2026-02-01']);
    expect(view.nextDueDate).toBeNull();
  });

  it('rejects an unknown agreement', () => {
    const { schedule } = build();
    expect(() => schedule.execute('missing')).toThrow(RentalAgreementNotFoundError);
  });
});
