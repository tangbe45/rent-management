import type {
  RentInstallmentRepository,
  RentPaymentRepository,
} from '../domain/rent-payment-repository';
import { AgreementHasActivePaymentsError } from './errors';

/**
 * Safe boundary used by Rental Agreement Management before an agreement's terms
 * change before its start date. Unallocated installments are discarded so they
 * can be regenerated from the revised terms; if any active (non-reversed)
 * payment still touches the agreement, the change is blocked and the landlord
 * must reverse those payments first. Reversed payments keep their history.
 */
export interface RentInstallmentResetPort {
  resetForAgreement(agreementId: string): void;
}

export class ResetAgreementInstallments implements RentInstallmentResetPort {
  constructor(
    private readonly deps: {
      installments: RentInstallmentRepository;
      payments: RentPaymentRepository;
    },
  ) {}

  resetForAgreement(agreementId: string): void {
    const installments = this.deps.installments.findByAgreementId(agreementId);
    const installmentIds = installments.map((installment) => installment.id);
    const allocations =
      this.deps.payments.findAllocationsByInstallmentIds(installmentIds);
    const paymentIds = [...new Set(allocations.map((allocation) => allocation.paymentId))];
    const reversedPaymentIds = new Set(
      this.deps.payments
        .findReversalsByPaymentIds(paymentIds)
        .map((reversal) => reversal.paymentId),
    );
    const hasActiveAllocation = allocations.some(
      (allocation) => !reversedPaymentIds.has(allocation.paymentId),
    );
    if (hasActiveAllocation) {
      throw new AgreementHasActivePaymentsError(agreementId);
    }
    this.deps.installments.deleteByAgreement(agreementId);
  }
}
