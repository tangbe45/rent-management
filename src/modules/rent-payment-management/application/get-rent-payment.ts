import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { RentPayment } from '../domain/payment';
import type { RentPaymentReversal } from '../domain/payment-reversal';
import type { RentPaymentRepository } from '../domain/rent-payment-repository';

export interface RentPaymentAllocationDetail {
  installmentId: string;
  installmentDueDate: CalendarDateString;
  amount: number;
}

export interface RentPaymentDetails {
  payment: RentPayment;
  reversal: RentPaymentReversal | null;
  allocations: RentPaymentAllocationDetail[];
}

/**
 * Full details for one payment: the immutable payment, its reversal (if any) and
 * the allocation breakdown by rent period. The allocation's period is read from
 * the stored due-date snapshot so it survives a pre-start installment reset.
 */
export class GetRentPayment {
  constructor(private readonly deps: { payments: RentPaymentRepository }) {}

  execute(paymentId: string): RentPaymentDetails | null {
    const payment = this.deps.payments.findById(paymentId);
    if (payment === null) {
      return null;
    }
    const reversal = this.deps.payments.findReversalByPaymentId(payment.id);
    const allocations = this.deps.payments
      .findAllocationsByPaymentId(payment.id)
      .map((allocation) => ({
        installmentId: allocation.installmentId,
        installmentDueDate: allocation.installmentDueDate,
        amount: allocation.amount,
      }));
    return { payment, reversal, allocations };
  }
}
