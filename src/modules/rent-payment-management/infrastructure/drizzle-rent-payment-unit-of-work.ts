import { database, type Database } from '../../../shared/infrastructure/database/connection';
import type {
  RentPaymentRepositories,
  RentPaymentUnitOfWork,
} from '../application/rent-payment-unit-of-work';
import {
  DrizzleRentInstallmentRepository,
  DrizzleRentPaymentRepository,
} from './drizzle-rent-payment-repository';
import { DrizzleRentalAgreementLookup } from './drizzle-rental-agreement-lookup';

/**
 * Runs recording and reversal inside a single SQLite transaction so a payment
 * and all of its allocations (or a reversal) succeed or fail together.
 */
export class DrizzleRentPaymentUnitOfWork implements RentPaymentUnitOfWork {
  run<T>(work: (repositories: RentPaymentRepositories) => T): T {
    return database.transaction((tx) => {
      const db = tx as unknown as Database;
      return work({
        installments: new DrizzleRentInstallmentRepository(db),
        payments: new DrizzleRentPaymentRepository(db),
        agreements: new DrizzleRentalAgreementLookup(db),
      });
    });
  }
}
