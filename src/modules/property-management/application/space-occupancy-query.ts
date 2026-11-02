import type { CalendarDateString } from '../../../shared/domain/calendar-date';

/**
 * Read-only occupancy facts for one space, derived from Rental Agreements.
 * Occupancy is owned by Rental Agreement Management and is never stored on the
 * space: this port only carries the derived answer across the module boundary.
 */
export interface SpaceOccupancySnapshot {
  spaceId: string;
  /** A rental agreement is ACTIVE on this space today. */
  hasCurrentAgreement: boolean;
  /** A rental agreement only starts in the future on this space. */
  hasUpcomingAgreement: boolean;
}

/**
 * Dependency-inversion seam used by the Property workspace overview. The
 * implementation is supplied by Rental Agreement infrastructure, which answers
 * for every requested space in a single query (never one query per space).
 */
export interface SpaceOccupancyQuery {
  findForSpaces(spaceIds: readonly string[], today: CalendarDateString): SpaceOccupancySnapshot[];
}
