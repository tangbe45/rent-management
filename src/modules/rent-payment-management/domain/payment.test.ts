import { InvalidRentInstallmentError } from './installment';
import { RentPayment, isPaymentMethod } from './payment';
import { RentPaymentAllocation } from './allocation';
import {
  InvalidRentPaymentReversalError,
  RentPaymentReversal,
  isPaymentReversalReason,
} from './payment-reversal';

describe('RentPayment', () => {
  it('creates a payment and normalizes optional text', () => {
    const payment = RentPayment.create({
      id: 'payment-1',
      agreementId: 'agreement-1',
      amount: 25_000,
      paymentDate: '2026-10-09',
      method: 'MOBILE_MONEY',
      reference: '  MOMO-42  ',
      notes: '   ',
      createdAt: 1000,
    });
    expect(payment.method).toBe('MOBILE_MONEY');
    expect(payment.reference).toBe('MOMO-42');
    expect(payment.notes).toBeNull();
  });

  it('rejects a zero or negative amount', () => {
    expect(() =>
      RentPayment.create({
        id: 'payment-1',
        agreementId: 'agreement-1',
        amount: 0,
        paymentDate: '2026-10-09',
        method: 'CASH',
        createdAt: 1000,
      }),
    ).toThrow(InvalidRentInstallmentError);
  });

  it('rejects an unsupported payment method', () => {
    expect(() =>
      RentPayment.create({
        id: 'payment-1',
        agreementId: 'agreement-1',
        amount: 100,
        paymentDate: '2026-10-09',
        method: 'CRYPTO',
        createdAt: 1000,
      }),
    ).toThrow();
    expect(isPaymentMethod('CASH')).toBe(true);
    expect(isPaymentMethod('CRYPTO')).toBe(false);
  });

  it('rejects an invalid payment date', () => {
    expect(() =>
      RentPayment.create({
        id: 'payment-1',
        agreementId: 'agreement-1',
        amount: 100,
        paymentDate: '09/10/2026',
        method: 'CASH',
        createdAt: 1000,
      }),
    ).toThrow();
  });
});

describe('RentPaymentAllocation', () => {
  it('creates a positive allocation snapshot', () => {
    const allocation = RentPaymentAllocation.create({
      id: 'allocation-1',
      paymentId: 'payment-1',
      installmentId: 'installment-1',
      installmentDueDate: '2026-01-01',
      amount: 25_000,
      createdAt: 1000,
    });
    expect(allocation.installmentDueDate).toBe('2026-01-01');
  });

  it('rejects a non-positive allocation', () => {
    expect(() =>
      RentPaymentAllocation.create({
        id: 'allocation-1',
        paymentId: 'payment-1',
        installmentId: 'installment-1',
        installmentDueDate: '2026-01-01',
        amount: 0,
        createdAt: 1000,
      }),
    ).toThrow(InvalidRentInstallmentError);
  });
});

describe('RentPaymentReversal', () => {
  it('requires an explanation when the reason is Other', () => {
    expect(() =>
      RentPaymentReversal.create({
        paymentId: 'payment-1',
        reason: 'OTHER',
        reversedAt: 2000,
      }),
    ).toThrow(InvalidRentPaymentReversalError);
  });

  it('accepts Other with an explanation', () => {
    const reversal = RentPaymentReversal.create({
      paymentId: 'payment-1',
      reason: 'OTHER',
      explanation: 'Bank reversed the transfer.',
      reversedAt: 2000,
    });
    expect(reversal.reason).toBe('OTHER');
    expect(reversal.explanation).toBe('Bank reversed the transfer.');
  });

  it('accepts a predefined reason without an explanation', () => {
    const reversal = RentPaymentReversal.create({
      paymentId: 'payment-1',
      reason: 'DUPLICATE',
      reversedAt: 2000,
    });
    expect(reversal.explanation).toBeNull();
  });

  it('rejects an unknown reason', () => {
    expect(() =>
      RentPaymentReversal.create({
        paymentId: 'payment-1',
        reason: 'BECAUSE',
        reversedAt: 2000,
      }),
    ).toThrow(InvalidRentPaymentReversalError);
    expect(isPaymentReversalReason('WRONG_AMOUNT')).toBe(true);
    expect(isPaymentReversalReason('BECAUSE')).toBe(false);
  });
});
