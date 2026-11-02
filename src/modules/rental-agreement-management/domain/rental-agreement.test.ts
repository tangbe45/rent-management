import {
  InvalidRentalAgreementEndDateError,
  InvalidRentalAgreementFirstRentDueDateError,
  InvalidRentalAgreementRentAmountError,
  InvalidRentalAgreementRentFrequencyError,
  InvalidRentalAgreementSecurityDepositError,
  InvalidRentalAgreementTerminationDateError,
  RentalAgreement,
  RentalAgreementAlreadyTerminatedError,
  RentalAgreementTerminatedError,
} from './rental-agreement';

function build(overrides: Partial<Parameters<typeof RentalAgreement.create>[0]> = {}) {
  return RentalAgreement.create({
    id: 'agreement-1',
    tenantId: 'tenant-1',
    spaceId: 'space-1',
    startDate: '2026-03-01',
    endDate: null,
    rentAmount: 50_000,
    rentFrequency: 'MONTHLY',
    firstRentDueDate: '2026-03-01',
    createdAt: 1000,
    ...overrides,
  });
}

describe('RentalAgreement creation and normalization', () => {
  it('creates an up-front agreement with normalized optional values', () => {
    const agreement = build({ endDate: '  ', securityDepositAmount: null, notes: '   ' });

    expect(agreement.id).toBe('agreement-1');
    expect(agreement.tenantId).toBe('tenant-1');
    expect(agreement.spaceId).toBe('space-1');
    expect(agreement.startDate).toBe('2026-03-01');
    expect(agreement.endDate).toBeNull();
    expect(agreement.terminationDate).toBeNull();
    expect(agreement.rentAmount).toBe(50_000);
    expect(agreement.rentFrequency).toBe('MONTHLY');
    expect(agreement.firstRentDueDate).toBe('2026-03-01');
    expect(agreement.securityDepositAmount).toBeNull();
    expect(agreement.notes).toBeNull();
    expect(agreement.createdAt).toBe(1000);
    expect(agreement.updatedAt).toBe(1000);
  });

  it('trims notes and stores an optional positive deposit', () => {
    const agreement = build({ notes: '  Quiet tenant  ', securityDepositAmount: 100_000 });

    expect(agreement.notes).toBe('Quiet tenant');
    expect(agreement.securityDepositAmount).toBe(100_000);
  });

  it('rejects a non-positive or non-integer rent amount', () => {
    expect(() => build({ rentAmount: 0 })).toThrow(InvalidRentalAgreementRentAmountError);
    expect(() => build({ rentAmount: -1 })).toThrow(InvalidRentalAgreementRentAmountError);
    expect(() => build({ rentAmount: 12.5 })).toThrow(InvalidRentalAgreementRentAmountError);
  });

  it('rejects a non-positive deposit but accepts an omitted one', () => {
    expect(() => build({ securityDepositAmount: 0 })).toThrow(
      InvalidRentalAgreementSecurityDepositError,
    );
    expect(() => build({ securityDepositAmount: 1.5 })).toThrow(
      InvalidRentalAgreementSecurityDepositError,
    );
  });

  it('rejects an unsupported rent frequency', () => {
    expect(() => build({ rentFrequency: 'WEEKLY' })).toThrow(InvalidRentalAgreementRentFrequencyError);
  });

  it('rejects an end date before the start date', () => {
    expect(() => build({ startDate: '2026-03-01', endDate: '2026-02-28' })).toThrow(
      InvalidRentalAgreementEndDateError,
    );
  });

  it('accepts an end date equal to the start date (inclusive boundary)', () => {
    expect(build({ startDate: '2026-03-01', endDate: '2026-03-01' }).endDate).toBe('2026-03-01');
  });

  it('accepts a first rent due date before or after the start date', () => {
    expect(build({ startDate: '2026-03-01', firstRentDueDate: '2026-02-15' }).firstRentDueDate).toBe(
      '2026-02-15',
    );
    expect(build({ startDate: '2026-03-01', firstRentDueDate: '2026-03-15' }).firstRentDueDate).toBe(
      '2026-03-15',
    );
  });

  it('rejects a first rent due date after the end date', () => {
    expect(() =>
      build({ startDate: '2026-03-01', endDate: '2026-06-30', firstRentDueDate: '2026-07-01' }),
    ).toThrow(InvalidRentalAgreementFirstRentDueDateError);
  });

  it('allows any first rent due date when there is no end date', () => {
    expect(() => build({ endDate: null, firstRentDueDate: '2030-01-01' })).not.toThrow();
  });
});

describe('RentalAgreement lifecycle derivation', () => {
  it('is UPCOMING before the start date', () => {
    const agreement = build({ startDate: '2026-03-01' });
    expect(agreement.lifecycleOn('2026-02-28')).toBe('UPCOMING');
  });

  it('is ACTIVE on the start date and through the end date', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(agreement.lifecycleOn('2026-03-01')).toBe('ACTIVE');
    expect(agreement.lifecycleOn('2026-06-30')).toBe('ACTIVE');
  });

  it('is ACTIVE indefinitely when there is no end date', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: null });
    expect(agreement.lifecycleOn('2035-01-01')).toBe('ACTIVE');
  });

  it('is ENDED the day after a natural end date', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(agreement.lifecycleOn('2026-07-01')).toBe('ENDED');
  });

  it('is TERMINATED once a termination has been recorded, regardless of dates', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: '2026-12-31' }).terminate(
      '2026-05-15',
      2000,
    );
    expect(agreement.lifecycleOn('2026-03-01')).toBe('TERMINATED');
    expect(agreement.lifecycleOn('2030-01-01')).toBe('TERMINATED');
  });
});

describe('RentalAgreement termination', () => {
  it('records a termination, preserves the end date and updates updatedAt', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: '2026-12-31' });
    const terminated = agreement.terminate('2026-06-15', 2000);

    expect(terminated.terminationDate).toBe('2026-06-15');
    expect(terminated.endDate).toBe('2026-12-31');
    expect(terminated.updatedAt).toBe(2000);
    expect(terminated.createdAt).toBe(1000);
    expect(terminated.effectiveEndDate).toBe('2026-06-15');
  });

  it('rejects a termination before the start date', () => {
    const agreement = build({ startDate: '2026-03-01' });
    expect(() => agreement.terminate('2026-02-28', 2000)).toThrow(
      InvalidRentalAgreementTerminationDateError,
    );
  });

  it('accepts termination on the start date', () => {
    const agreement = build({ startDate: '2026-03-01' });
    expect(agreement.terminate('2026-03-01', 2000).terminationDate).toBe('2026-03-01');
  });

  it('requires termination strictly before an existing end date', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(() => agreement.terminate('2026-06-30', 2000)).toThrow(
      InvalidRentalAgreementTerminationDateError,
    );
    expect(agreement.terminate('2026-06-29', 2000).terminationDate).toBe('2026-06-29');
  });

  it('allows a future-dated termination', () => {
    const agreement = build({ startDate: '2026-03-01' });
    expect(agreement.terminate('2026-12-31', 2000).terminationDate).toBe('2026-12-31');
  });

  it('rejects terminating twice', () => {
    const terminated = build().terminate('2026-03-15', 2000);
    expect(() => terminated.terminate('2026-04-01', 3000)).toThrow(
      RentalAgreementAlreadyTerminatedError,
    );
  });
});

describe('RentalAgreement term editing', () => {
  it('revises terms before the start date while preserving identity', () => {
    const revised = build().reviseTerms({
      tenantId: 'tenant-2',
      spaceId: 'space-2',
      startDate: '2026-04-01',
      endDate: '2026-09-30',
      rentAmount: 60_000,
      rentFrequency: 'QUARTERLY',
      firstRentDueDate: '2026-04-01',
      updatedAt: 2000,
    });

    expect(revised.id).toBe('agreement-1');
    expect(revised.tenantId).toBe('tenant-2');
    expect(revised.spaceId).toBe('space-2');
    expect(revised.startDate).toBe('2026-04-01');
    expect(revised.rentAmount).toBe(60_000);
    expect(revised.rentFrequency).toBe('QUARTERLY');
    expect(revised.createdAt).toBe(1000);
    expect(revised.updatedAt).toBe(2000);
  });

  it('refuses to change terms after a termination', () => {
    const terminated = build().terminate('2026-03-15', 2000);
    expect(() =>
      terminated.reviseTerms({
        tenantId: 'tenant-1',
        spaceId: 'space-1',
        startDate: '2026-03-01',
        rentAmount: 1,
        rentFrequency: 'MONTHLY',
        firstRentDueDate: '2026-03-01',
        updatedAt: 3000,
      }),
    ).toThrow(RentalAgreementTerminatedError);
  });

  it('updates notes without changing terms', () => {
    const updated = build().updateNotes('  moved in early  ', 2000);
    expect(updated.notes).toBe('moved in early');
    expect(updated.startDate).toBe('2026-03-01');
    expect(updated.updatedAt).toBe(2000);
  });
});

describe('RentalAgreement inclusive overlap detection', () => {
  it('treats boundaries as inclusive on both sides', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(agreement.overlaps({ startDate: '2026-06-30', effectiveEndDate: '2026-07-31' })).toBe(true);
    expect(agreement.overlaps({ startDate: '2026-02-01', effectiveEndDate: '2026-03-01' })).toBe(true);
  });

  it('allows consecutive non-overlapping agreements', () => {
    const agreement = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(agreement.overlaps({ startDate: '2026-07-01', effectiveEndDate: null })).toBe(false);
  });

  it('overlaps when either side has no predetermined end', () => {
    const openEnded = build({ startDate: '2026-03-01', endDate: null });
    expect(openEnded.overlaps({ startDate: '2030-01-01', effectiveEndDate: null })).toBe(true);
    const bounded = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(bounded.overlaps({ startDate: '2026-01-01', effectiveEndDate: null })).toBe(true);
  });

  it('uses the termination date as the effective end for overlap', () => {
    const terminated = build({ startDate: '2026-03-01', endDate: null }).terminate('2026-05-01', 2);
    expect(terminated.overlaps({ startDate: '2026-05-01', effectiveEndDate: null })).toBe(true);
    expect(terminated.overlaps({ startDate: '2026-05-02', effectiveEndDate: null })).toBe(false);
  });
});

describe('RentalAgreement archive protection', () => {
  it('blocks archiving while active or upcoming', () => {
    const upcoming = build({ startDate: '2026-06-01' });
    expect(upcoming.blocksArchiveOn('2026-01-01')).toBe(true);
    const active = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(active.blocksArchiveOn('2026-05-01')).toBe(true);
  });

  it('does not block archiving after the effective end date has passed', () => {
    const ended = build({ startDate: '2026-03-01', endDate: '2026-06-30' });
    expect(ended.blocksArchiveOn('2026-07-01')).toBe(false);
    const terminated = build({ startDate: '2026-03-01', endDate: null }).terminate('2026-05-01', 2);
    expect(terminated.blocksArchiveOn('2026-05-02')).toBe(false);
  });

  it('blocks archiving for a future-dated termination', () => {
    const terminated = build({ startDate: '2026-03-01', endDate: null }).terminate('2026-12-31', 2);
    expect(terminated.blocksArchiveOn('2026-05-01')).toBe(true);
  });
});
