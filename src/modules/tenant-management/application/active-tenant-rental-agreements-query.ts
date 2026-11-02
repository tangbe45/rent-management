/**
 * Application port answering whether a tenant is currently bound by a rental
 * agreement. Rental Agreements are not implemented yet, so this is the seam
 * that keeps tenant archival from depending on a slice that does not exist. The
 * infrastructure implements it with a stub until the Rental Agreement module
 * provides the real answer.
 */
export interface ActiveTenantRentalAgreementsQuery {
  hasActiveForTenant(tenantId: string): boolean;
}
