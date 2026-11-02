import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import type { RentInstallment } from '../domain/installment';
import {
  ensureInstallments,
  type EnsureInstallmentsInput,
} from './installment-generation';
import type { RentPaymentUnitOfWork } from './rent-payment-unit-of-work';

/**
 * Generates or retrieves the persisted rent obligations for an agreement's
 * viewing window. Idempotent, and never creates installments past the effective
 * end date (see `installment-generation.ts`).
 */
export class EnsureInstallments {
  constructor(
    private readonly deps: {
      unitOfWork: RentPaymentUnitOfWork;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: EnsureInstallmentsInput): RentInstallment[] {
    return this.deps.unitOfWork.run((repositories) =>
      ensureInstallments(repositories, input, this.deps),
    );
  }
}
