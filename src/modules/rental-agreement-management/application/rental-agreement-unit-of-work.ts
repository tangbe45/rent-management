import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';
import type { PropertyLookup } from './property-lookup';
import type { SpaceLookup } from './space-lookup';
import type { TenantLookup } from './tenant-lookup';

/**
 * Write-side repository set exposed inside a single transaction. Creating,
 * editing and terminating an agreement must validate the tenant, property,
 * space hierarchy and overlap conflict, then persist, atomically.
 */
export interface RentalAgreementRepositories {
  agreements: RentalAgreementRepository;
  tenants: TenantLookup;
  properties: PropertyLookup;
  spaces: SpaceLookup;
}

export interface RentalAgreementUnitOfWork {
  run<T>(work: (repositories: RentalAgreementRepositories) => T): T;
}
