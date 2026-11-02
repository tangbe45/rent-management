import { InvalidRentalAgreementTerminationDateError } from '../domain/rental-agreement';
import { RentalAgreementNotFoundError } from './rental-agreement-errors';
import {
  agreementAt,
  FakeRentalAgreementClock,
  InMemoryRentalAgreementRepository,
} from './test-support';
import { TerminateRentalAgreement } from './terminate-rental-agreement';

function build() {
  const agreements = new InMemoryRentalAgreementRepository();
  const clock = new FakeRentalAgreementClock(7000, '2026-04-01');
  const terminate = new TerminateRentalAgreement({ agreements, clock });
  return { agreements, terminate };
}

describe('TerminateRentalAgreement', () => {
  it('records an early termination, preserves the end date and shortens the effective end', () => {
    const { agreements, terminate } = build();
    agreements.save(agreementAt({ id: 'agreement-1', startDate: '2026-01-01', endDate: '2026-12-31' }));

    const terminated = terminate.execute({ id: 'agreement-1', terminationDate: '2026-04-30' });

    expect(terminated.terminationDate).toBe('2026-04-30');
    expect(terminated.endDate).toBe('2026-12-31');
    expect(terminated.effectiveEndDate).toBe('2026-04-30');
    expect(terminated.updatedAt).toBe(7000);
    expect(agreements.findById('agreement-1')?.isTerminated).toBe(true);
  });

  it('rejects an unknown agreement', () => {
    const { terminate } = build();
    expect(() => terminate.execute({ id: 'missing', terminationDate: '2026-04-30' })).toThrow(
      RentalAgreementNotFoundError,
    );
  });

  it('rejects a termination before the start date or at/after the end date', () => {
    const { agreements, terminate } = build();
    agreements.save(agreementAt({ id: 'agreement-1', startDate: '2026-01-01', endDate: '2026-12-31' }));

    expect(() => terminate.execute({ id: 'agreement-1', terminationDate: '2025-12-31' })).toThrow(
      InvalidRentalAgreementTerminationDateError,
    );
    expect(() => terminate.execute({ id: 'agreement-1', terminationDate: '2026-12-31' })).toThrow(
      InvalidRentalAgreementTerminationDateError,
    );
  });
});
