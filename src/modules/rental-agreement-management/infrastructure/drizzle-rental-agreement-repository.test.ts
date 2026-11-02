import { RentalAgreement } from '../domain/rental-agreement';
import {
  toRentalAgreementData,
  toRentalAgreementRow,
  type RentalAgreementRow,
} from './drizzle-rental-agreement-repository';

const baseRow: RentalAgreementRow = {
  id: 'agreement-1',
  tenantId: 'tenant-1',
  spaceId: 'space-1',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  terminationDate: null,
  rentAmount: 50_000,
  rentFrequency: 'MONTHLY',
  firstRentDueDate: '2026-01-01',
  securityDepositAmount: 100_000,
  notes: 'Pays on time',
  createdAt: 1000,
  updatedAt: 1000,
};

describe('drizzle rental-agreement row mapping', () => {
  it('round-trips a bounded agreement preserving date-only strings and integer money', () => {
    const agreement = RentalAgreement.hydrate(baseRow);

    const row = toRentalAgreementRow(agreement);
    expect(row).toEqual(baseRow);

    const restored = RentalAgreement.hydrate(toRentalAgreementData(row));
    expect(restored.id).toBe('agreement-1');
    expect(restored.startDate).toBe('2026-01-01');
    expect(restored.endDate).toBe('2026-12-31');
    expect(restored.rentAmount).toBe(50_000);
    expect(restored.securityDepositAmount).toBe(100_000);
  });

  it('preserves null end, termination, deposit and notes', () => {
    const openEnded: RentalAgreementRow = {
      ...baseRow,
      endDate: null,
      terminationDate: null,
      securityDepositAmount: null,
      notes: null,
    };

    const row = toRentalAgreementRow(RentalAgreement.hydrate(openEnded));
    expect(row.endDate).toBeNull();
    expect(row.terminationDate).toBeNull();
    expect(row.securityDepositAmount).toBeNull();
    expect(row.notes).toBeNull();
  });

  it('preserves a recorded termination alongside the original end date', () => {
    const terminated: RentalAgreementRow = {
      ...baseRow,
      terminationDate: '2026-06-30',
      updatedAt: 2000,
    };

    const row = toRentalAgreementRow(RentalAgreement.hydrate(terminated));
    expect(row.terminationDate).toBe('2026-06-30');
    expect(row.endDate).toBe('2026-12-31');
    expect(row.updatedAt).toBe(2000);
  });

  it('maps every rent frequency through the row shape', () => {
    const frequencies = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as const;

    for (const rentFrequency of frequencies) {
      const row = toRentalAgreementRow(RentalAgreement.hydrate({ ...baseRow, rentFrequency }));
      expect(row.rentFrequency).toBe(rentFrequency);
      expect(RentalAgreement.hydrate(toRentalAgreementData(row)).rentFrequency).toBe(rentFrequency);
    }
  });
});
