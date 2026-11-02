import {
  RentInstallment,
  deriveInstallmentStanding,
  InvalidRentInstallmentError,
} from './installment';

const amount = 50_000;

describe('deriveInstallmentStanding', () => {
  it('marks a fully settled installment as paid even before its due date', () => {
    const standing = deriveInstallmentStanding({
      dueDate: '2026-11-01',
      amount,
      paidAmount: amount,
      today: '2026-10-09',
    });
    expect(standing.status).toBe('PAID');
    expect(standing.remainingAmount).toBe(0);
  });

  it('marks an overpaid installment as paid with no negative remainder', () => {
    const standing = deriveInstallmentStanding({
      dueDate: '2026-11-01',
      amount,
      paidAmount: amount + 5_000,
      today: '2026-10-09',
    });
    expect(standing.status).toBe('PAID');
    expect(standing.remainingAmount).toBe(0);
  });

  it('marks a past-due installment with a balance as overdue', () => {
    const standing = deriveInstallmentStanding({
      dueDate: '2026-10-01',
      amount,
      paidAmount: 0,
      today: '2026-10-09',
    });
    expect(standing.status).toBe('OVERDUE');
    expect(standing.remainingAmount).toBe(amount);
  });

  it('keeps overdue ahead of partially paid when part of the rent was received', () => {
    const standing = deriveInstallmentStanding({
      dueDate: '2026-10-01',
      amount,
      paidAmount: 20_000,
      today: '2026-10-09',
    });
    expect(standing.status).toBe('OVERDUE');
    expect(standing.paidAmount).toBe(20_000);
    expect(standing.remainingAmount).toBe(30_000);
  });

  it('marks an installment due today and unpaid as due, never overdue', () => {
    const standing = deriveInstallmentStanding({
      dueDate: '2026-10-09',
      amount,
      paidAmount: 0,
      today: '2026-10-09',
    });
    expect(standing.status).toBe('DUE');
  });

  it('marks a future installment with a partial payment as partially paid', () => {
    const standing = deriveInstallmentStanding({
      dueDate: '2026-11-01',
      amount,
      paidAmount: 10_000,
      today: '2026-10-09',
    });
    expect(standing.status).toBe('PARTIAL');
    expect(standing.remainingAmount).toBe(40_000);
  });

  it('marks an untouched future installment as upcoming', () => {
    const standing = deriveInstallmentStanding({
      dueDate: '2026-11-01',
      amount,
      paidAmount: 0,
      today: '2026-10-09',
    });
    expect(standing.status).toBe('UPCOMING');
  });

  it('treats the day after a due date as overdue (date-only boundary)', () => {
    const before = deriveInstallmentStanding({
      dueDate: '2026-10-09',
      amount,
      paidAmount: 0,
      today: '2026-10-09',
    });
    const after = deriveInstallmentStanding({
      dueDate: '2026-10-09',
      amount,
      paidAmount: 0,
      today: '2026-10-10',
    });
    expect(before.status).toBe('DUE');
    expect(after.status).toBe('OVERDUE');
  });
});

describe('RentInstallment', () => {
  it('creates a valid installment snapshot', () => {
    const installment = RentInstallment.create({
      id: 'installment-1',
      agreementId: 'agreement-1',
      dueDate: '2026-01-01',
      periodIndex: 0,
      amount,
      createdAt: 1000,
    });
    expect(installment.amount).toBe(amount);
    expect(installment.periodIndex).toBe(0);
  });

  it('rejects a non-positive amount', () => {
    expect(() =>
      RentInstallment.create({
        id: 'installment-1',
        agreementId: 'agreement-1',
        dueDate: '2026-01-01',
        periodIndex: 0,
        amount: 0,
        createdAt: 1000,
      }),
    ).toThrow(InvalidRentInstallmentError);
  });

  it('rejects an invalid due date', () => {
    expect(() =>
      RentInstallment.create({
        id: 'installment-1',
        agreementId: 'agreement-1',
        dueDate: '2026-13-40',
        periodIndex: 0,
        amount,
        createdAt: 1000,
      }),
    ).toThrow(InvalidRentInstallmentError);
  });
});
