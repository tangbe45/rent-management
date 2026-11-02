import { compareCalendarDates } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { RentPaymentAllocation } from '../domain/allocation';
import { RentPayment } from '../domain/payment';
import {
  AllocationExceedsBalanceError,
  CrossAgreementAllocationError,
  DuplicateAllocationError,
  EmptyPaymentAllocationsError,
  FutureRentPaymentDateError,
  PaymentAllocationMismatchError,
  RentAgreementNotFoundError,
  RentInstallmentNotFoundError,
} from './errors';
import { buildObligationRows } from './rent-obligations';
import type { RentPaymentRepositories, RentPaymentUnitOfWork } from './rent-payment-unit-of-work';

export interface RentPaymentAllocationInput {
  installmentId: string;
  amount: number;
}

export interface RecordRentPaymentInput {
  agreementId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  allocations: readonly RentPaymentAllocationInput[];
}

/**
 * Entitlement boundary. Uses the existing subscription policy so recording a
 * payment is blocked when the subscription is not active, while unrelated
 * operations are never gated.
 */
export interface RecordPaymentEntitlement {
  assertCanRecordRentalPayment(): void;
}

/**
 * Records a full or partial payment together with its allocations in one SQLite
 * transaction. The payment amount must equal the sum of the allocations, every
 * allocation must land on an installment of the same agreement, and no
 * allocation may exceed that installment's remaining balance. A future payment
 * date is rejected. If any step fails the whole transaction rolls back.
 */
export class RecordRentPayment {
  constructor(
    private readonly deps: {
      unitOfWork: RentPaymentUnitOfWork;
      clock: Clock;
      idGenerator: IdGenerator;
      subscriptionAccess: RecordPaymentEntitlement;
    },
  ) {}

  execute(input: RecordRentPaymentInput): RentPayment {
    return this.deps.unitOfWork.run((repositories) => {
      this.deps.subscriptionAccess.assertCanRecordRentalPayment();
      return record(repositories, input, this.deps);
    });
  }
}

export function record(
  repositories: RentPaymentRepositories,
  input: RecordRentPaymentInput,
  deps: { clock: Clock; idGenerator: IdGenerator },
): RentPayment {
  const agreement = repositories.agreements.findById(input.agreementId);
  if (agreement === null) {
    throw new RentAgreementNotFoundError(input.agreementId);
  }

  const today = deps.clock.today();
  if (compareCalendarDates(input.paymentDate.trim(), today) > 0) {
    throw new FutureRentPaymentDateError();
  }

  const payment = RentPayment.create({
    id: deps.idGenerator.next(),
    agreementId: agreement.id,
    amount: input.amount,
    paymentDate: input.paymentDate,
    method: input.method,
    reference: input.reference,
    notes: input.notes,
    createdAt: deps.clock.now(),
  });

  if (input.allocations.length === 0) {
    throw new EmptyPaymentAllocationsError();
  }

  const seen = new Set<string>();
  for (const allocation of input.allocations) {
    if (seen.has(allocation.installmentId)) {
      throw new DuplicateAllocationError(allocation.installmentId);
    }
    seen.add(allocation.installmentId);
  }

  const targetInstallments = repositories.installments.findByIds(
    input.allocations.map((allocation) => allocation.installmentId),
  );
  const byId = new Map(targetInstallments.map((installment) => [installment.id, installment]));

  for (const allocation of input.allocations) {
    const installment = byId.get(allocation.installmentId);
    if (installment === undefined) {
      throw new RentInstallmentNotFoundError(allocation.installmentId);
    }
    if (installment.agreementId !== agreement.id) {
      throw new CrossAgreementAllocationError();
    }
  }

  const allocatedTotal = input.allocations.reduce((total, allocation) => total + allocation.amount, 0);
  if (allocatedTotal !== payment.amount) {
    throw new PaymentAllocationMismatchError();
  }

  const rows = buildObligationRows(repositories, targetInstallments, today);
  const remainingById = new Map(rows.map((row) => [row.installment.id, row.remainingAmount]));
  for (const allocation of input.allocations) {
    const remaining = remainingById.get(allocation.installmentId) ?? 0;
    if (allocation.amount > remaining) {
      throw new AllocationExceedsBalanceError(allocation.installmentId);
    }
  }

  const allocations = input.allocations.map((allocation) =>
    RentPaymentAllocation.create({
      id: deps.idGenerator.next(),
      paymentId: payment.id,
      installmentId: allocation.installmentId,
      installmentDueDate: byId.get(allocation.installmentId)?.dueDate ?? today,
      amount: allocation.amount,
      createdAt: deps.clock.now(),
    }),
  );

  repositories.payments.save(payment);
  repositories.payments.saveAllocations(allocations);
  return payment;
}
