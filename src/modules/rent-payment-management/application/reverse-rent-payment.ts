import type { Clock } from '../../../shared/domain/clock';
import { RentPaymentReversal } from '../domain/payment-reversal';
import {
  RentPaymentAlreadyReversedError,
  RentPaymentNotFoundError,
} from './errors';
import type { RentPaymentUnitOfWork } from './rent-payment-unit-of-work';

export interface ReverseRentPaymentInput {
  paymentId: string;
  reason: string;
  explanation?: string | null;
}

/**
 * Reverses a payment by recording a separate reversal fact. The original payment
 * and all of its allocations are left untouched, so the audit trail is complete.
 * Reversing is not gated by the subscription policy: only recording a new
 * payment and generating a receipt are blocked when the subscription is inactive.
 */
export class ReverseRentPayment {
  constructor(
    private readonly deps: {
      unitOfWork: RentPaymentUnitOfWork;
      clock: Clock;
    },
  ) {}

  execute(input: ReverseRentPaymentInput): RentPaymentReversal {
    return this.deps.unitOfWork.run((repositories) => {
      const payment = repositories.payments.findById(input.paymentId);
      if (payment === null) {
        throw new RentPaymentNotFoundError(input.paymentId);
      }
      if (repositories.payments.findReversalByPaymentId(payment.id) !== null) {
        throw new RentPaymentAlreadyReversedError(payment.id);
      }
      const reversal = RentPaymentReversal.create({
        paymentId: payment.id,
        reason: input.reason,
        explanation: input.explanation,
        reversedAt: this.deps.clock.now(),
      });
      repositories.payments.saveReversal(reversal);
      return reversal;
    });
  }
}
