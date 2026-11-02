import type { Clock } from '../../../shared/domain/clock';
import type { PropertySpace } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';
import {
  projectSpaceAvailability,
  summarizeAvailability,
  type SpaceAvailability,
  type WorkspaceAvailabilitySummary,
} from './property-space-availability';
import type { SpaceOccupancyQuery } from './space-occupancy-query';

export interface PropertyWorkspaceOverview {
  spaces: PropertySpace[];
  availability: ReadonlyMap<string, SpaceAvailability>;
  summary: WorkspaceAvailabilitySummary;
}

/**
 * Read model for the property workspace. Spaces are read once and occupancy is
 * read once for the whole property, so the overview never performs a query per
 * space. Both sources are local, so the workspace works fully offline.
 */
export class GetPropertyWorkspaceOverview {
  constructor(
    private readonly deps: {
      spaces: PropertySpaceRepository;
      occupancy: SpaceOccupancyQuery;
      clock: Clock;
    },
  ) {}

  execute(input: { propertyId: string }): PropertyWorkspaceOverview {
    const spaces = this.deps.spaces.findByPropertyId(input.propertyId);
    const occupancy =
      spaces.length === 0
        ? []
        : this.deps.occupancy.findForSpaces(
            spaces.map((space) => space.id),
            this.deps.clock.today(),
          );
    const availability = projectSpaceAvailability(spaces, occupancy);
    return {
      spaces,
      availability,
      summary: summarizeAvailability(spaces, availability),
    };
  }
}
