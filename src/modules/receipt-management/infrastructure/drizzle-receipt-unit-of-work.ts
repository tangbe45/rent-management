import { database, type Database } from '../../../shared/infrastructure/database/connection';
import type { ReceiptRepositories, ReceiptUnitOfWork } from '../application/receipt-unit-of-work';
import {
  DrizzleReceiptNumberSequenceRepository,
  DrizzleReceiptRepository,
} from './drizzle-receipt-repository';

/**
 * Runs receipt finalization inside a single SQLite transaction so the receipt
 * row and its consumed number succeed or fail together.
 */
export class DrizzleReceiptUnitOfWork implements ReceiptUnitOfWork {
  run<T>(work: (repositories: ReceiptRepositories) => T): T {
    return database.transaction((tx) => {
      const db = tx as unknown as Database;
      return work({
        receipts: new DrizzleReceiptRepository(db),
        sequence: new DrizzleReceiptNumberSequenceRepository(db),
      });
    });
  }
}