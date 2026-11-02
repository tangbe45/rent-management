import type { Database } from '../../../shared/infrastructure/database/connection';
import { accounts } from '../../../shared/infrastructure/database/schema/accounts';
import type { LandlordIdentityLookup } from '../application/receipt-asset-reader';

/**
 * Reads the landlord's display name from the account (its single source of
 * truth) so a receipt never duplicates it in settings. The MVP has exactly one
 * account, so the first row is the landlord.
 */
export class DrizzleLandlordIdentityLookup implements LandlordIdentityLookup {
  constructor(private readonly db: Database) {}

  findFullName(): string | null {
    const row = this.db.select({ fullName: accounts.fullName }).from(accounts).get();
    return row?.fullName ?? null;
  }
}