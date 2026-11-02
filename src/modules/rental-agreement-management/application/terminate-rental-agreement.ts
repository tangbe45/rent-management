import type { Clock } from '../../../shared/domain/clock';
import type { RentalAgreement } from '../domain/rental-agreement';
import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';
import { RentalAgreementNotFoundError } from './rental-agreement-errors';

export interface TerminateRentalAgreementInput {
  id: string;
  terminationDate: string;
}

/**
 * Records an early termination on an agreement. The original `endDate` is
 * preserved and the effective end date becomes the termination date, which
 * shortens the scheduled rent dates. The agreement remains readable.
 */
export class TerminateRentalAgreement {
  constructor(
    private readonly deps: {
      agreements: RentalAgreementRepository;
      clock: Clock;
    },
  ) {}

  execute(input: TerminateRentalAgreementInput): RentalAgreement {
    const existing = this.deps.agreements.findById(input.id);
    if (existing === null) {
      throw new RentalAgreementNotFoundError(input.id);
    }
    const terminated = existing.terminate(input.terminationDate, this.deps.clock.now());
    this.deps.agreements.update(terminated);
    return terminated;
  }
}
