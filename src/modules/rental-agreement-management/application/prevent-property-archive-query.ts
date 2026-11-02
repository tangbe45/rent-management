import type { Clock } from '../../../shared/domain/clock';
import type { ActiveRentalAgreementsQuery } from '../../property-management/application/active-rental-agreements-query';
import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';
import type { SpaceLookup } from './space-lookup';

/**
 * Real, agreement-aware replacement for the Property Management placeholder. A
 * property is protected from archiving while any of its spaces (at any depth)
 * carries an agreement that has not effectively ended.
 */
export class PreventPropertyArchiveQuery implements ActiveRentalAgreementsQuery {
  constructor(
    private readonly deps: {
      agreements: RentalAgreementRepository;
      spaces: SpaceLookup;
      clock: Clock;
    },
  ) {}

  hasActiveForProperty(propertyId: string): boolean {
    const spaceIds = this.deps.spaces
      .findByPropertyId(propertyId)
      .map((space) => space.id);
    if (spaceIds.length === 0) {
      return false;
    }
    const today = this.deps.clock.today();
    return this.deps.agreements
      .findAll({ spaceIds })
      .some((agreement) => agreement.blocksArchiveOn(today));
  }
}
