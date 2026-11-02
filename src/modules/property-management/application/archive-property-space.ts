import type { Clock } from '../../../shared/domain/clock';
import type { PropertySpace } from '../domain/property-space';
import { PropertySpaceArchivedError } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';
import {
  PropertySpaceCannotArchiveError,
  PropertySpaceNotFoundError,
} from './property-space-errors';
import type { SpaceActiveRentalAgreementsQuery } from './space-active-rental-agreements-query';

export interface ArchivePropertySpaceInput {
  id: string;
}

/**
 * Archives a space. A space may only be archived while it is active and while it
 * has no active rental agreements. Archiving never touches descendants: the tree
 * remains intact, nothing is deleted, and restoring brings back the same
 * identity. The rental-agreement rule is enforced through the
 * `SpaceActiveRentalAgreementsQuery` application boundary.
 */
export class ArchivePropertySpace {
  constructor(
    private readonly deps: {
      spaces: PropertySpaceRepository;
      activeRentalAgreements: SpaceActiveRentalAgreementsQuery;
      clock: Clock;
    },
  ) {}

  execute(input: ArchivePropertySpaceInput): PropertySpace {
    const space = this.deps.spaces.findById(input.id);
    if (space === null) {
      throw new PropertySpaceNotFoundError(input.id);
    }
    if (space.isArchived) {
      throw new PropertySpaceArchivedError(space.id);
    }
    if (this.deps.activeRentalAgreements.hasActiveForSpace(space.id)) {
      throw new PropertySpaceCannotArchiveError(space.id);
    }

    const archived = space.archive(this.deps.clock.now());
    this.deps.spaces.update(archived);
    return archived;
  }
}