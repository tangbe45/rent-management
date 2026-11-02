import type { Clock } from '../../../shared/domain/clock';
import type { Property } from '../domain/property';
import { PropertyAlreadyArchivedError } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';
import type { ActiveRentalAgreementsQuery } from './active-rental-agreements-query';
import { ArchiveBlockedByActiveRentalAgreementsError, PropertyNotFoundError } from './errors';

export interface ArchivePropertyInput {
  id: string;
}

/**
 * Archives a property. A property may only be archived while it is active and
 * while it has no active rental agreements. The rental-agreement rule is
 * enforced through the `ActiveRentalAgreementsQuery` application boundary
 * rather than by referencing the (not yet implemented) Rental Agreement module.
 */
export class ArchiveProperty {
  constructor(
    private readonly deps: {
      properties: PropertyRepository;
      activeRentalAgreements: ActiveRentalAgreementsQuery;
      clock: Clock;
    },
  ) {}

  execute(input: ArchivePropertyInput): Property {
    const property = this.deps.properties.findById(input.id);
    if (property === null) {
      throw new PropertyNotFoundError(input.id);
    }
    if (property.isArchived) {
      throw new PropertyAlreadyArchivedError(property.id);
    }
    if (this.deps.activeRentalAgreements.hasActiveForProperty(property.id)) {
      throw new ArchiveBlockedByActiveRentalAgreementsError(property.id);
    }

    const archived = property.archive(this.deps.clock.now());
    this.deps.properties.update(archived);
    return archived;
  }
}