import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import {
  deriveInstallmentStanding,
  type InstallmentStatus,
  type RentInstallment,
} from '../domain/installment';
import { ensureInstallments, type EnsureInstallmentsInput } from './installment-generation';
import type {
  RentPaymentRepositories,
  RentPaymentUnitOfWork,
} from './rent-payment-unit-of-work';

export interface RentObligationRow {
  installment: RentInstallment;
  paidAmount: number;
  remainingAmount: number;
  status: InstallmentStatus;
}

/**
 * Builds the derived view of a set of installments from the persisted payment
 * history. Allocations belonging to reversed payments are excluded from the net
 * paid amount, so a reversed payment removes its effect on every obligation it
 * touched.
 */
export function buildObligationRows(
  repositories: RentPaymentRepositories,
  installments: readonly RentInstallment[],
  today: CalendarDateString,
): RentObligationRow[] {
  const installmentIds = installments.map((installment) => installment.id);
  const allocations = repositories.payments.findAllocationsByInstallmentIds(installmentIds);
  const paymentIds = [...new Set(allocations.map((allocation) => allocation.paymentId))];
  const reversedPaymentIds = new Set(
    repositories.payments.findReversalsByPaymentIds(paymentIds).map((reversal) => reversal.paymentId),
  );

  const paidByInstallment = new Map<string, number>();
  for (const allocation of allocations) {
    if (reversedPaymentIds.has(allocation.paymentId)) {
      continue;
    }
    paidByInstallment.set(
      allocation.installmentId,
      (paidByInstallment.get(allocation.installmentId) ?? 0) + allocation.amount,
    );
  }

  return installments.map((installment) => {
    const standing = deriveInstallmentStanding({
      dueDate: installment.dueDate,
      amount: installment.amount,
      paidAmount: paidByInstallment.get(installment.id) ?? 0,
      today,
    });
    return { installment, ...standing };
  });
}

/**
 * Lists an agreement's rent obligations for an inclusive window, generating the
 * missing installments for that window first (lazy generation) and deriving each
 * row's status from the net payment history.
 */
export class ListRentObligations {
  constructor(
    private readonly deps: {
      unitOfWork: RentPaymentUnitOfWork;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: EnsureInstallmentsInput): RentObligationRow[] {
    const today = this.deps.clock.today();
    return this.deps.unitOfWork.run((repositories) => {
      const installments = ensureInstallments(repositories, input, this.deps);
      return buildObligationRows(repositories, installments, today);
    });
  }
}
