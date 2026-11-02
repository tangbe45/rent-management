import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type {
  SpaceOccupancyQuery,
  SpaceOccupancySnapshot,
} from '../../property-management/application/space-occupancy-query';
import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';

/**
 * Answers space occupancy for the Property workspace in a single agreement
 * query. Lifecycle stays derived here, so Property Management never duplicates
 * the rental-lifecycle rules and never stores occupancy.
 */
export class AgreementSpaceOccupancyQuery implements SpaceOccupancyQuery {
  constructor(private readonly deps: { agreements: RentalAgreementRepository }) {}

  findForSpaces(
    spaceIds: readonly string[],
    today: CalendarDateString,
  ): SpaceOccupancySnapshot[] {
    if (spaceIds.length === 0) {
      return [];
    }
    const facts = new Map<string, { current: boolean; upcoming: boolean }>();
    for (const agreement of this.deps.agreements.findAll({ spaceIds })) {
      const lifecycle = agreement.lifecycleOn(today);
      if (lifecycle !== 'ACTIVE' && lifecycle !== 'UPCOMING') {
        continue;
      }
      const entry = facts.get(agreement.spaceId) ?? { current: false, upcoming: false };
      if (lifecycle === 'ACTIVE') {
        entry.current = true;
      } else {
        entry.upcoming = true;
      }
      facts.set(agreement.spaceId, entry);
    }
    return [...facts.entries()].map(([spaceId, entry]) => ({
      spaceId,
      hasCurrentAgreement: entry.current,
      // A current agreement takes precedence: a future agreement on an occupied
      // space must never make it look available.
      hasUpcomingAgreement: entry.current ? false : entry.upcoming,
    }));
  }
}
