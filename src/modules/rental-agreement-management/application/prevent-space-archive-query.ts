import type { Clock } from '../../../shared/domain/clock';
import type { SpaceActiveRentalAgreementsQuery } from '../../property-management/application/space-active-rental-agreements-query';
import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';
import type { SpaceLookup } from './space-lookup';

/**
 * Real, agreement-aware replacement for the Property Space placeholder. A space
 * is protected from archiving while an agreement that has not effectively ended
 * exists on the space itself, on any ancestor, or on any descendant, matching the
 * hierarchy-conflict rules.
 */
export class PreventSpaceArchiveQuery implements SpaceActiveRentalAgreementsQuery {
  constructor(
    private readonly deps: {
      agreements: RentalAgreementRepository;
      spaces: SpaceLookup;
      clock: Clock;
    },
  ) {}

  hasActiveForSpace(spaceId: string): boolean {
    const today = this.deps.clock.today();
    const related = new Set<string>([spaceId]);
    for (const ancestor of this.deps.spaces.findAncestors(spaceId)) {
      related.add(ancestor.id);
    }
    for (const descendant of this.deps.spaces.findDescendantIds(spaceId)) {
      related.add(descendant);
    }
    return this.deps.agreements
      .findAll({ spaceIds: [...related] })
      .some((agreement) => agreement.blocksArchiveOn(today));
  }
}
