import { CreateRentalAgreement } from './create-rental-agreement';
import {
  RentalAgreementAncestorArchivedError,
  RentalAgreementPeriodConflictError,
  RentalAgreementPropertyArchivedError,
  RentalAgreementPropertyNotFoundError,
  RentalAgreementSpaceArchivedError,
  RentalAgreementSpaceNotFoundError,
  RentalAgreementSpaceNotRentableError,
  RentalAgreementSpacePropertyMismatchError,
  RentalAgreementTenantArchivedError,
  RentalAgreementTenantNotFoundError,
} from './rental-agreement-errors';
import {
  agreementAt,
  FakeRentalAgreementClock,
  InMemoryRentalAgreementRepository,
  InMemoryRentalAgreementUnitOfWork,
  propertyRef,
  SequentialRentalAgreementIdGenerator,
  spaceRef,
  StubPropertyLookup,
  StubSpaceLookup,
  StubTenantLookup,
  tenantRef,
} from './test-support';

function build() {
  const agreements = new InMemoryRentalAgreementRepository();
  const tenants = new StubTenantLookup([tenantRef('tenant-1'), tenantRef('tenant-2')]);
  const properties = new StubPropertyLookup([propertyRef('property-1'), propertyRef('property-2')]);
  const spaces = new StubSpaceLookup([
    spaceRef({ id: 'building', propertyId: 'property-1' }),
    spaceRef({ id: 'space-1', propertyId: 'property-1', parentSpaceId: 'building' }),
    spaceRef({ id: 'space-2', propertyId: 'property-1', parentSpaceId: 'building' }),
    spaceRef({ id: 'other-space', propertyId: 'property-2' }),
  ]);
  const clock = new FakeRentalAgreementClock(5000, '2026-02-01');
  const unitOfWork = new InMemoryRentalAgreementUnitOfWork({
    agreements,
    tenants,
    properties,
    spaces,
  });
  const create = new CreateRentalAgreement({
    unitOfWork,
    clock,
    idGenerator: new SequentialRentalAgreementIdGenerator(),
  });
  return { agreements, tenants, properties, spaces, create };
}

const baseInput = {
  tenantId: 'tenant-1',
  propertyId: 'property-1',
  spaceId: 'space-1',
  startDate: '2026-03-01',
  rentAmount: 50_000,
  rentFrequency: 'MONTHLY',
  firstRentDueDate: '2026-03-01',
};

describe('CreateRentalAgreement', () => {
  it('creates and persists a valid agreement', () => {
    const { agreements, create } = build();

    const agreement = create.execute({ ...baseInput, endDate: '2026-09-30', notes: '  ok  ' });

    expect(agreement.id).toBe('agreement-1');
    expect(agreement.tenantId).toBe('tenant-1');
    expect(agreement.spaceId).toBe('space-1');
    expect(agreement.endDate).toBe('2026-09-30');
    expect(agreement.notes).toBe('ok');
    expect(agreement.createdAt).toBe(5000);
    expect(agreements.findById('agreement-1')).toBe(agreement);
  });

  it('rejects a missing or archived tenant', () => {
    const { tenants, create } = build();
    expect(() => create.execute({ ...baseInput, tenantId: 'missing' })).toThrow(
      RentalAgreementTenantNotFoundError,
    );

    tenants.archive('tenant-1');
    expect(() => create.execute(baseInput)).toThrow(RentalAgreementTenantArchivedError);
  });

  it('rejects a missing or archived property', () => {
    const { properties, create } = build();
    expect(() => create.execute({ ...baseInput, propertyId: 'missing' })).toThrow(
      RentalAgreementPropertyNotFoundError,
    );

    properties.archive('property-1');
    expect(() => create.execute(baseInput)).toThrow(RentalAgreementPropertyArchivedError);
  });

  it('rejects a missing or archived space', () => {
    const { spaces, create } = build();
    expect(() => create.execute({ ...baseInput, spaceId: 'missing' })).toThrow(
      RentalAgreementSpaceNotFoundError,
    );

    spaces.archive('space-1');
    expect(() => create.execute(baseInput)).toThrow(RentalAgreementSpaceArchivedError);
  });

  it('rejects a non-rentable space', () => {
    const spaces = new StubSpaceLookup([
      spaceRef({ id: 'space-1', propertyId: 'property-1', rentable: false }),
    ]);
    const unitOfWork = new InMemoryRentalAgreementUnitOfWork({
      agreements: new InMemoryRentalAgreementRepository(),
      tenants: new StubTenantLookup([tenantRef('tenant-1')]),
      properties: new StubPropertyLookup([propertyRef('property-1')]),
      spaces,
    });
    const create = new CreateRentalAgreement({
      unitOfWork,
      clock: new FakeRentalAgreementClock(),
      idGenerator: new SequentialRentalAgreementIdGenerator(),
    });
    expect(() => create.execute(baseInput)).toThrow(RentalAgreementSpaceNotRentableError);
  });

  it('rejects a space that does not belong to the selected property', () => {
    const { create } = build();
    expect(() =>
      create.execute({ ...baseInput, propertyId: 'property-2', spaceId: 'space-1' }),
    ).toThrow(RentalAgreementSpacePropertyMismatchError);
  });

  it('rejects an archived ancestor', () => {
    const { spaces, create } = build();
    spaces.archive('building');
    expect(() => create.execute(baseInput)).toThrow(RentalAgreementAncestorArchivedError);
  });

  it('rejects overlapping historical, current and future agreements on the same space', () => {
    const { agreements, create } = build();
    agreements.save(
      agreementAt({ id: 'hist', spaceId: 'space-1', startDate: '2025-01-01', endDate: '2025-12-31' }),
    );
    expect(() =>
      create.execute({
        ...baseInput,
        startDate: '2025-06-01',
        endDate: '2025-08-01',
        firstRentDueDate: '2025-06-01',
      }),
    ).toThrow(RentalAgreementPeriodConflictError);

    agreements.save(
      agreementAt({ id: 'future', spaceId: 'space-1', startDate: '2027-01-01', endDate: null }),
    );
    expect(() =>
      create.execute({
        ...baseInput,
        startDate: '2027-06-01',
        endDate: '2027-08-01',
        firstRentDueDate: '2027-06-01',
      }),
    ).toThrow(RentalAgreementPeriodConflictError);
  });

  it('rejects conflicts on an ancestor and on a descendant', () => {
    const { agreements, create } = build();
    agreements.save(agreementAt({ id: 'ancestor', spaceId: 'building', startDate: '2026-03-01', endDate: '2026-12-31' }));
    expect(() => create.execute(baseInput)).toThrow(RentalAgreementPeriodConflictError);

    const second = build();
    second.agreements.save(
      agreementAt({ id: 'descendant', spaceId: 'space-1', startDate: '2026-03-01', endDate: '2026-12-31' }),
    );
    expect(() =>
      second.create.execute({ ...baseInput, spaceId: 'building' }),
    ).toThrow(RentalAgreementPeriodConflictError);
  });

  it('allows sibling spaces and separate tenants concurrently', () => {
    const { agreements, create } = build();
    agreements.save(
      agreementAt({ id: 'other', spaceId: 'space-2', startDate: '2026-03-01', endDate: '2026-06-30' }),
    );
    expect(create.execute(baseInput).id).toBe('agreement-1');
  });

  it('allows consecutive non-overlapping agreements on the same space', () => {
    const { agreements, create } = build();
    agreements.save(
      agreementAt({ id: 'first', spaceId: 'space-1', startDate: '2026-01-01', endDate: '2026-02-28' }),
    );
    expect(create.execute({ ...baseInput, startDate: '2026-03-01' }).id).toBe('agreement-1');
  });
});
