/**
 * Application-level boundary that answers one question for the Property Space
 * module: "does this space have any active rental agreements?"
 *
 * The Property Space domain must not know about rental agreements, and the
 * Rental Agreement module does not exist yet. This port is the
 * dependency-inversion seam: `ArchivePropertySpace` depends on this interface,
 * and infrastructure supplies a documented placeholder until the real Rental
 * Agreement slice replaces it. No rental-agreement entity, table or logic is
 * introduced here.
 */
export interface SpaceActiveRentalAgreementsQuery {
  hasActiveForSpace(spaceId: string): boolean;
}