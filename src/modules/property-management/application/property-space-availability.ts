import type { PropertySpace } from '../domain/property-space';
import type { SpaceOccupancySnapshot } from './space-occupancy-query';

/**
 * Presentation labels describing whether a space can currently receive a new
 * rental agreement. They are derived on demand from persisted spaces plus
 * Rental Agreement occupancy — never stored on the space itself.
 */
export const SPACE_AVAILABILITY_LABELS = [
  'OCCUPIED',
  'UPCOMING',
  'AVAILABLE',
  'NOT_RENTABLE',
  'ARCHIVED',
  'SUSPENDED',
] as const;

export type SpaceAvailability = (typeof SPACE_AVAILABILITY_LABELS)[number];

export interface WorkspaceAvailabilitySummary {
  /** Active spaces the landlord marked as rentable, regardless of occupancy. */
  rentableSpaces: number;
  occupiedSpaces: number;
  upcomingSpaces: number;
  availableSpaces: number;
}

function hasArchivedAncestor(
  space: PropertySpace,
  byId: ReadonlyMap<string, PropertySpace>,
): boolean {
  const seen = new Set<string>([space.id]);
  let parentId = space.parentSpaceId;
  while (parentId !== null && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (parent === undefined) {
      return false;
    }
    if (parent.isArchived) {
      return true;
    }
    seen.add(parentId);
    parentId = parent.parentSpaceId;
  }
  return false;
}

/**
 * Projects the availability label of every space from the persisted hierarchy
 * and the occupancy facts supplied by Rental Agreement Management.
 *
 * Precedence is fixed by the specification: not rentable, then archived or
 * suspended by an archived ancestor, then occupied, then upcoming, then
 * available. An occupied space with a future agreement therefore stays
 * occupied until its current agreement ends.
 */
export function projectSpaceAvailability(
  spaces: readonly PropertySpace[],
  occupancy: readonly SpaceOccupancySnapshot[],
): Map<string, SpaceAvailability> {
  const byId = new Map(spaces.map((space) => [space.id, space]));
  const occupiedSpaceIds = new Set<string>();
  const upcomingSpaceIds = new Set<string>();
  for (const snapshot of occupancy) {
    if (snapshot.hasCurrentAgreement) {
      occupiedSpaceIds.add(snapshot.spaceId);
    } else if (snapshot.hasUpcomingAgreement) {
      upcomingSpaceIds.add(snapshot.spaceId);
    }
  }

  const availability = new Map<string, SpaceAvailability>();
  for (const space of spaces) {
    let label: SpaceAvailability;
    if (!space.rentable) {
      label = 'NOT_RENTABLE';
    } else if (space.isArchived) {
      label = 'ARCHIVED';
    } else if (hasArchivedAncestor(space, byId)) {
      label = 'SUSPENDED';
    } else if (occupiedSpaceIds.has(space.id)) {
      label = 'OCCUPIED';
    } else if (upcomingSpaceIds.has(space.id)) {
      label = 'UPCOMING';
    } else {
      label = 'AVAILABLE';
    }
    availability.set(space.id, label);
  }
  return availability;
}

/**
 * Property-level counters for the workspace. Non-rentable spaces never count
 * towards the rentable total, and archived spaces are excluded because the
 * workspace summarises the active property. Occupied, upcoming and available
 * partition the rentable spaces.
 */
export function summarizeAvailability(
  spaces: readonly PropertySpace[],
  availability: ReadonlyMap<string, SpaceAvailability>,
): WorkspaceAvailabilitySummary {
  const summary: WorkspaceAvailabilitySummary = {
    rentableSpaces: 0,
    occupiedSpaces: 0,
    upcomingSpaces: 0,
    availableSpaces: 0,
  };
  for (const space of spaces) {
    if (space.isArchived || !space.rentable) {
      continue;
    }
    summary.rentableSpaces += 1;
    const label = availability.get(space.id);
    if (label === 'OCCUPIED') {
      summary.occupiedSpaces += 1;
    } else if (label === 'UPCOMING') {
      summary.upcomingSpaces += 1;
    } else if (label === 'AVAILABLE') {
      summary.availableSpaces += 1;
    }
  }
  return summary;
}
