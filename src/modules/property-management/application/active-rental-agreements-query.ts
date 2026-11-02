/**
 * Application-level boundary that answers one question for Property Management:
 * "does this property have any active rental agreements?"
 *
 * The Property domain must not know about rental agreements, and the Rental
 * Agreement module does not exist yet. This port is the dependency-inversion
 * seam: `ArchiveProperty` depends on this interface, and infrastructure
 * supplies a documented placeholder implementation until the real Rental
 * Agreement slice replaces it. No rental-agreement table, entity or logic is
 * introduced here.
 */
export interface ActiveRentalAgreementsQuery {
  hasActiveForProperty(propertyId: string): boolean;
}