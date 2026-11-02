import {
  RentalAgreementNotFoundError,
  RentalAgreementPeriodConflictError,
  RentalAgreementTermsLockedError,
} from './rental-agreement-errors';
import type { RentInstallmentResetPort } from '../../rent-payment-management/application/reset-agreement-installments';
import {
  agreementAt,
  FakeRentalAgreementClock,
  InMemoryRentalAgreementRepository,
  InMemoryRentalAgreementUnitOfWork,
  propertyRef,
  spaceRef,
  StubPropertyLookup,
  StubSpaceLookup,
  StubTenantLookup,
  tenantRef,
} from './test-support';
import { UpdateRentalAgreement } from './update-rental-agreement';

function build(clockDate = '2026-02-01', installments?: RentInstallmentResetPort) {
  const agreements = new InMemoryRentalAgreementRepository();
  const tenants = new StubTenantLookup([tenantRef('tenant-1'), tenantRef('tenant-2')]);
  const properties = new StubPropertyLookup([propertyRef('property-1')]);
  const spaces = new StubSpaceLookup([
    spaceRef({ id: 'building', propertyId: 'property-1' }),
    spaceRef({ id: 'space-1', propertyId: 'property-1', parentSpaceId: 'building' }),
    spaceRef({ id: 'space-2', propertyId: 'property-1', parentSpaceId: 'building' }),
  ]);
  const clock = new FakeRentalAgreementClock(9000, clockDate);
  const unitOfWork = new InMemoryRentalAgreementUnitOfWork({
    agreements,
    tenants,
    properties,
    spaces,
  });
  const update = new UpdateRentalAgreement({ unitOfWork, clock, installments });
  return { agreements, update };
}

const baseInput = {
  id: 'agreement-1',
  tenantId: 'tenant-1',
  propertyId: 'property-1',
  spaceId: 'space-1',
  startDate: '2026-03-01',
  endDate: null,
  rentAmount: 50_000,
  rentFrequency: 'MONTHLY',
  firstRentDueDate: '2026-03-01',
  notes: null,
};

describe('UpdateRentalAgreement', () => {
  it('rejects an unknown agreement', () => {
    const { update } = build();
    expect(() => update.execute(baseInput)).toThrow(RentalAgreementNotFoundError);
  });

  it('edits all terms before the start date', () => {
    const { agreements, update } = build();
    agreements.save(
      agreementAt({ id: 'agreement-1', startDate: '2026-03-01', firstRentDueDate: '2026-03-01' }),
    );

    const updated = update.execute({
      ...baseInput,
      tenantId: 'tenant-2',
      spaceId: 'space-2',
      startDate: '2026-04-01',
      endDate: '2026-10-31',
      rentAmount: 75_000,
      rentFrequency: 'QUARTERLY',
      firstRentDueDate: '2026-04-01',
      notes: 'renewed',
    });

    expect(updated.tenantId).toBe('tenant-2');
    expect(updated.spaceId).toBe('space-2');
    expect(updated.startDate).toBe('2026-04-01');
    expect(updated.rentAmount).toBe(75_000);
    expect(updated.rentFrequency).toBe('QUARTERLY');
    expect(updated.notes).toBe('renewed');
    expect(updated.updatedAt).toBe(9000);
  });

  it('revalidates conflicts after an edit', () => {
    const { agreements, update } = build();
    agreements.save(agreementAt({ id: 'agreement-1', startDate: '2026-03-01', spaceId: 'space-1' }));
    agreements.save(
      agreementAt({ id: 'other', startDate: '2026-05-01', endDate: '2026-08-31', spaceId: 'space-1' }),
    );

    expect(() =>
      update.execute({ ...baseInput, startDate: '2026-06-01', endDate: '2026-07-01' }),
    ).toThrow(RentalAgreementPeriodConflictError);
  });

  it('ignores the agreement itself when checking conflicts', () => {
    const { agreements, update } = build();
    agreements.save(
      agreementAt({
        id: 'agreement-1',
        startDate: '2026-03-01',
        endDate: '2026-06-30',
        spaceId: 'space-1',
      }),
    );

    const updated = update.execute({ ...baseInput, startDate: '2026-03-15', endDate: '2026-07-15' });
    expect(updated.startDate).toBe('2026-03-15');
  });

  it('locks all terms once the agreement has started', () => {
    const { agreements, update } = build('2026-03-01');
    agreements.save(
      agreementAt({ id: 'agreement-1', startDate: '2026-03-01', firstRentDueDate: '2026-03-01' }),
    );

    expect(() => update.execute({ ...baseInput, rentAmount: 99_000 })).toThrow(
      RentalAgreementTermsLockedError,
    );
  });

  it('still allows notes-only edits after the start date', () => {
    const { agreements, update } = build('2026-03-01');
    agreements.save(
      agreementAt({ id: 'agreement-1', startDate: '2026-03-01', firstRentDueDate: '2026-03-01' }),
    );

    const updated = update.execute({ ...baseInput, notes: 'paid in cash' });
    expect(updated.notes).toBe('paid in cash');
  });

  it('discards installments when terms change before the start date', () => {
    const reset: string[] = [];
    const { agreements, update } = build('2026-02-01', {
      resetForAgreement: (agreementId) => void reset.push(agreementId),
    });
    agreements.save(
      agreementAt({ id: 'agreement-1', startDate: '2026-03-01', firstRentDueDate: '2026-03-01' }),
    );

    update.execute({ ...baseInput, rentAmount: 65_000 });

    expect(reset).toEqual(['agreement-1']);
  });

  it('leaves installments alone for a notes-only edit before the start date', () => {
    const reset: string[] = [];
    const { agreements, update } = build('2026-02-01', {
      resetForAgreement: (agreementId) => reset.push(agreementId),
    });
    agreements.save(
      agreementAt({ id: 'agreement-1', startDate: '2026-03-01', firstRentDueDate: '2026-03-01' }),
    );

    update.execute({ ...baseInput, notes: 'draft note' });
    expect(reset).toEqual([]);
  });

  it('propagates the block when active payments prevent discarding installments', () => {
    const installments: RentInstallmentResetPort = {
      resetForAgreement: () => {
        throw new Error('active payments');
      },
    };
    const { agreements, update } = build('2026-02-01', installments);
    agreements.save(
      agreementAt({ id: 'agreement-1', startDate: '2026-03-01', firstRentDueDate: '2026-03-01' }),
    );

    expect(() => update.execute({ ...baseInput, rentAmount: 60_000 })).toThrow('active payments');
  });
});
