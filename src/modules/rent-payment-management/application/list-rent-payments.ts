import type { RentPayment } from '../domain/payment';
import type {
  RentPaymentFilter,
  RentPaymentRepository,
} from '../domain/rent-payment-repository';

export interface RentPaymentListRow {
  payment: RentPayment;
  reversed: boolean;
}

/**
 * Payment history, newest first. Reversed payments are still listed but flagged,
 * because the history is never deleted.
 */
export class ListRentPayments {
  constructor(private readonly deps: { payments: RentPaymentRepository }) {}

  execute(filter: RentPaymentFilter = {}): RentPaymentListRow[] {
    const payments = this.deps.payments.findAll(filter);
    const reversedIds = new Set(
      this.deps.payments
        .findReversalsByPaymentIds(payments.map((payment) => payment.id))
        .map((reversal) => reversal.paymentId),
    );
    return [...payments]
      .sort((a, b) => {
        if (a.paymentDate !== b.paymentDate) {
          return a.paymentDate < b.paymentDate ? 1 : -1;
        }
        return b.createdAt - a.createdAt;
      })
      .map((payment) => ({ payment, reversed: reversedIds.has(payment.id) }));
  }
}
