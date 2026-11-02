import { RentPaymentAllocation } from '../domain/allocation';
import { RentInstallment } from '../domain/installment';
import { RentPayment } from '../domain/payment';
import { RentPaymentReversal } from '../domain/payment-reversal';
import {
  toRentInstallmentData,
  toRentInstallmentRow,
  toRentPaymentAllocationData,
  toRentPaymentAllocationRow,
  toRentPaymentData,
  toRentPaymentReversalData,
  toRentPaymentReversalRow,
  toRentPaymentRow,
  type RentInstallmentRow,
  type RentPaymentAllocationRow,
  type RentPaymentReversalRow,
  type RentPaymentRow,
} from './drizzle-rent-payment-repository';

const installmentRow: RentInstallmentRow = {
  id: 'installment-1',
  agreementId: 'agreement-1',
  dueDate: '2026-01-01',
  periodIndex: 0,
  amount: 50_000,
  createdAt: 1000,
};

const paymentRow: RentPaymentRow = {
  id: 'payment-1',
  agreementId: 'agreement-1',
  amount: 50_000,
  paymentDate: '2026-01-05',
  method: 'MOBILE_MONEY',
  reference: 'MM-1',
  notes: null,
  createdAt: 1000,
};

const allocationRow: RentPaymentAllocationRow = {
  id: 'allocation-1',
  paymentId: 'payment-1',
  installmentId: 'installment-1',
  installmentDueDate: '2026-01-01',
  amount: 50_000,
  createdAt: 1000,
};

const reversalRow: RentPaymentReversalRow = {
  paymentId: 'payment-1',
  reason: 'WRONG_AMOUNT',
  explanation: 'Typed one zero too many.',
  reversedAt: 2000,
};

describe('drizzle rent-payment row mapping', () => {
  it('round-trips an installment preserving date-only strings and integer money', () => {
    const installment = RentInstallment.hydrate(installmentRow);
    const row = toRentInstallmentRow(installment);
    expect(row).toEqual(installmentRow);

    const restored = RentInstallment.hydrate(toRentInstallmentData(row));
    expect(restored.agreementId).toBe('agreement-1');
    expect(restored.dueDate).toBe('2026-01-01');
    expect(restored.periodIndex).toBe(0);
    expect(restored.amount).toBe(50_000);
  });

  it('round-trips a payment preserving method, reference and null notes', () => {
    const payment = RentPayment.hydrate(paymentRow);
    const row = toRentPaymentRow(payment);
    expect(row).toEqual(paymentRow);

    const restored = RentPayment.hydrate(toRentPaymentData(row));
    expect(restored.method).toBe('MOBILE_MONEY');
    expect(restored.paymentDate).toBe('2026-01-05');
    expect(restored.reference).toBe('MM-1');
    expect(restored.notes).toBeNull();
  });

  it('round-trips an allocation keeping the installment due-date snapshot', () => {
    const allocation = RentPaymentAllocation.hydrate(allocationRow);
    const row = toRentPaymentAllocationRow(allocation);
    expect(row).toEqual(allocationRow);

    const restored = RentPaymentAllocation.hydrate(toRentPaymentAllocationData(row));
    expect(restored.paymentId).toBe('payment-1');
    expect(restored.installmentDueDate).toBe('2026-01-01');
    expect(restored.amount).toBe(50_000);
  });

  it('round-trips a reversal with a reason and explanation', () => {
    const reversal = RentPaymentReversal.hydrate(reversalRow);
    const row = toRentPaymentReversalRow(reversal);
    expect(row).toEqual(reversalRow);

    const restored = RentPaymentReversal.hydrate(toRentPaymentReversalData(row));
    expect(restored.paymentId).toBe('payment-1');
    expect(restored.reason).toBe('WRONG_AMOUNT');
    expect(restored.explanation).toBe('Typed one zero too many.');
    expect(restored.reversedAt).toBe(2000);
  });

  it('preserves a null explanation for a non-OTHER reversal', () => {
    const withoutExplanation: RentPaymentReversalRow = {
      ...reversalRow,
      reason: 'DUPLICATE',
      explanation: null,
    };
    const row = toRentPaymentReversalRow(RentPaymentReversal.hydrate(withoutExplanation));
    expect(row.explanation).toBeNull();
    expect(row.reason).toBe('DUPLICATE');
  });
});
