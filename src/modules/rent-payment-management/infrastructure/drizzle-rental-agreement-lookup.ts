import { eq } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { rentalAgreements } from '../../../shared/infrastructure/database/schema/rental-agreements';
import type {
  RentAgreementReference,
  RentalAgreementLookup,
} from '../application/rental-agreement-lookup';

/**
 * Read-only projection of a rental agreement used by the payment module:
 * identity, tenant/space context, the rent terms and the effective end date.
 * Terms stay owned by Rental Agreement Management.
 */
export interface RentalAgreementLookupRow {
  id: string;
  tenantId: string;
  spaceId: string;
  rentAmount: number;
  rentFrequency: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  firstRentDueDate: string;
  startDate: string;
  endDate: string | null;
  terminationDate: string | null;
}

export function toRentAgreementReference(row: RentalAgreementLookupRow): RentAgreementReference {
  return {
    id: row.id,
    tenantId: row.tenantId,
    spaceId: row.spaceId,
    rentAmount: row.rentAmount,
    rentFrequency: row.rentFrequency,
    firstRentDueDate: row.firstRentDueDate,
    startDate: row.startDate,
    effectiveEndDate: row.terminationDate ?? row.endDate,
  };
}

/**
 * Read-only boundary to rental agreements. Queries the `rental_agreements` table
 * directly so the payment module never imports another module's composition root
 * or repository.
 */
export class DrizzleRentalAgreementLookup implements RentalAgreementLookup {
  constructor(private readonly db: Database) {}

  findById(id: string): RentAgreementReference | null {
    const row = this.db.select().from(rentalAgreements).where(eq(rentalAgreements.id, id)).get();
    return row ? toRentAgreementReference(row) : null;
  }

  findByTenantId(tenantId: string): RentAgreementReference[] {
    return this.db
      .select()
      .from(rentalAgreements)
      .where(eq(rentalAgreements.tenantId, tenantId))
      .all()
      .map(toRentAgreementReference);
  }

  findAll(): RentAgreementReference[] {
    return this.db.select().from(rentalAgreements).all().map(toRentAgreementReference);
  }
}
