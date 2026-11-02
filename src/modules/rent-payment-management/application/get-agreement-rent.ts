import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { summarizeAgreement, type RentAgreementSummary } from './get-rent-summary';
import type { RentPaymentUnitOfWork } from './rent-payment-unit-of-work';

/**
 * The rent picture for a single agreement, so the rent screens can show one
 * agreement's obligations and record a payment against it without going through
 * the tenant list first.
 */
export class GetAgreementRent {
  constructor(
    private readonly deps: {
      unitOfWork: RentPaymentUnitOfWork;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: { agreementId: string }): RentAgreementSummary | null {
    const today = this.deps.clock.today();
    return this.deps.unitOfWork.run((repositories) => {
      const agreement = repositories.agreements.findById(input.agreementId);
      if (agreement === null) {
        return null;
      }
      return summarizeAgreement(repositories, agreement, today, this.deps);
    });
  }
}
