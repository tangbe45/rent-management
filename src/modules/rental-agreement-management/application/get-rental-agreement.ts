import type { RentalAgreement } from '../domain/rental-agreement';
import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';

export class GetRentalAgreement {
  constructor(private readonly deps: { agreements: RentalAgreementRepository }) {}

  execute(id: string): RentalAgreement | null {
    return this.deps.agreements.findById(id);
  }
}
