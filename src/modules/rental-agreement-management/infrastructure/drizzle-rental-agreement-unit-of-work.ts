import { database, type Database } from '../../../shared/infrastructure/database/connection';
import type {
  RentalAgreementRepositories,
  RentalAgreementUnitOfWork,
} from '../application/rental-agreement-unit-of-work';
import { DrizzlePropertyLookup } from './drizzle-property-lookup';
import { DrizzleRentalAgreementRepository } from './drizzle-rental-agreement-repository';
import { DrizzleSpaceLookup } from './drizzle-space-lookup';
import { DrizzleTenantLookup } from './drizzle-tenant-lookup';

/**
 * Runs creation/editing/termination inside a single SQLite transaction so that
 * placement validation, conflict detection and persistence succeed or fail
 * together. SQLite's write lock serializes writers, which also prevents
 * duplicate submissions from racing into conflicting agreements.
 */
export class DrizzleRentalAgreementUnitOfWork implements RentalAgreementUnitOfWork {
  run<T>(work: (repositories: RentalAgreementRepositories) => T): T {
    return database.transaction((tx) => {
      const db = tx as unknown as Database;
      return work({
        agreements: new DrizzleRentalAgreementRepository(db),
        tenants: new DrizzleTenantLookup(db),
        properties: new DrizzlePropertyLookup(db),
        spaces: new DrizzleSpaceLookup(db),
      });
    });
  }
}
