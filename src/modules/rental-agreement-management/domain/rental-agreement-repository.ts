import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { RentalAgreement } from './rental-agreement';

/**
 * Default page size for rental-agreement lists. Lifecycle is derived, so the
 * repository returns raw agreements and the application layer derives the
 * lifecycle before filtering and paginating.
 */
export const DEFAULT_RENTAL_AGREEMENT_PAGE_SIZE = 20;

/**
 * Context filter for agreement lists. `spaceIds` matches agreements bound to any
 * of the supplied spaces (used for property- and space-scoped lists).
 */
export interface RentalAgreementFilter {
  tenantId?: string;
  spaceIds?: readonly string[];
}

/**
 * Inclusive-period overlap probe. `spaceIds` is the candidate space plus its
 * ancestors and descendants. `effectiveEndDate === null` means the candidate has
 * no predetermined end. `excludeAgreementId` ignores the agreement being edited.
 */
export interface RentalAgreementOverlapQuery {
  spaceIds: readonly string[];
  startDate: CalendarDateString;
  effectiveEndDate: CalendarDateString | null;
  excludeAgreementId?: string;
}

/**
 * Persistence boundary for rental agreements. It exposes only domain types — no
 * Drizzle rows or SQLite connections leak into the domain or application layers.
 * `save` inserts a new agreement; `update` rewrites an existing one by its stable
 * id. Conflicts and archive protection are answered from the persisted set, never
 * from a stored status.
 */
export interface RentalAgreementRepository {
  save(agreement: RentalAgreement): void;
  update(agreement: RentalAgreement): void;
  findById(id: string): RentalAgreement | null;
  findAll(filter?: RentalAgreementFilter): RentalAgreement[];
  findOverlapping(query: RentalAgreementOverlapQuery): RentalAgreement[];
}
