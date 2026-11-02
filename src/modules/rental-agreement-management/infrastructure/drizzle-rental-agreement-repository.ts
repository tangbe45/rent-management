import { and, eq, gte, inArray, isNull, lte, ne, or, sql, type SQL } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { rentalAgreements } from '../../../shared/infrastructure/database/schema/rental-agreements';
import {
  RentalAgreement,
  type RentFrequency,
  type RentalAgreementData,
} from '../domain/rental-agreement';
import type {
  RentalAgreementFilter,
  RentalAgreementOverlapQuery,
  RentalAgreementRepository,
} from '../domain/rental-agreement-repository';

/**
 * Structural shape of a persisted rental-agreement row. Declaring it explicitly
 * keeps the Drizzle-specific row type out of the mapping helpers, which are pure
 * and unit-tested without a database.
 */
export interface RentalAgreementRow {
  id: string;
  tenantId: string;
  spaceId: string;
  startDate: string;
  endDate: string | null;
  terminationDate: string | null;
  rentAmount: number;
  rentFrequency: RentFrequency;
  firstRentDueDate: string;
  securityDepositAmount: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export function toRentalAgreementData(row: RentalAgreementRow): RentalAgreementData {
  return {
    id: row.id,
    tenantId: row.tenantId,
    spaceId: row.spaceId,
    startDate: row.startDate,
    endDate: row.endDate,
    terminationDate: row.terminationDate,
    rentAmount: row.rentAmount,
    rentFrequency: row.rentFrequency,
    firstRentDueDate: row.firstRentDueDate,
    securityDepositAmount: row.securityDepositAmount,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toRentalAgreementRow(agreement: RentalAgreement): RentalAgreementRow {
  return {
    id: agreement.id,
    tenantId: agreement.tenantId,
    spaceId: agreement.spaceId,
    startDate: agreement.startDate,
    endDate: agreement.endDate,
    terminationDate: agreement.terminationDate,
    rentAmount: agreement.rentAmount,
    rentFrequency: agreement.rentFrequency,
    firstRentDueDate: agreement.firstRentDueDate,
    securityDepositAmount: agreement.securityDepositAmount,
    notes: agreement.notes,
    createdAt: agreement.createdAt,
    updatedAt: agreement.updatedAt,
  };
}

export class DrizzleRentalAgreementRepository implements RentalAgreementRepository {
  constructor(private readonly db: Database) {}

  save(agreement: RentalAgreement): void {
    this.db.insert(rentalAgreements).values(toRentalAgreementRow(agreement)).run();
  }

  update(agreement: RentalAgreement): void {
    this.db
      .update(rentalAgreements)
      .set({
        tenantId: agreement.tenantId,
        spaceId: agreement.spaceId,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
        terminationDate: agreement.terminationDate,
        rentAmount: agreement.rentAmount,
        rentFrequency: agreement.rentFrequency,
        firstRentDueDate: agreement.firstRentDueDate,
        securityDepositAmount: agreement.securityDepositAmount,
        notes: agreement.notes,
        updatedAt: agreement.updatedAt,
      })
      .where(eq(rentalAgreements.id, agreement.id))
      .run();
  }

  findById(id: string): RentalAgreement | null {
    const row = this.db.select().from(rentalAgreements).where(eq(rentalAgreements.id, id)).get();
    return row ? RentalAgreement.hydrate(toRentalAgreementData(row)) : null;
  }

  findAll(filter: RentalAgreementFilter = {}): RentalAgreement[] {
    const conditions: SQL[] = [];
    if (filter.tenantId !== undefined) {
      conditions.push(eq(rentalAgreements.tenantId, filter.tenantId));
    }
    if (filter.spaceIds !== undefined) {
      conditions.push(inArray(rentalAgreements.spaceId, [...filter.spaceIds]));
    }
    const rows =
      conditions.length === 0
        ? this.db.select().from(rentalAgreements).orderBy(rentalAgreements.startDate).all()
        : this.db
            .select()
            .from(rentalAgreements)
            .where(and(...conditions))
            .orderBy(rentalAgreements.startDate)
            .all();
    return rows.map((row) => RentalAgreement.hydrate(toRentalAgreementData(row)));
  }

  findOverlapping(query: RentalAgreementOverlapQuery): RentalAgreement[] {
    const existingEffectiveEnd = sql<string | null>`coalesce(${rentalAgreements.terminationDate}, ${rentalAgreements.endDate})`;
    const conditions: SQL[] = [
      inArray(rentalAgreements.spaceId, [...query.spaceIds]),
      or(isNull(existingEffectiveEnd), gte(existingEffectiveEnd, query.startDate)) as SQL,
    ];
    if (query.effectiveEndDate !== null) {
      conditions.push(lte(rentalAgreements.startDate, query.effectiveEndDate));
    }
    if (query.excludeAgreementId !== undefined) {
      conditions.push(ne(rentalAgreements.id, query.excludeAgreementId));
    }
    return this.db
      .select()
      .from(rentalAgreements)
      .where(and(...conditions))
      .all()
      .map((row) => RentalAgreement.hydrate(toRentalAgreementData(row)));
  }
}
