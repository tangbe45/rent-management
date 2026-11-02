import { and, count, eq, isNotNull, isNull, like, or, type SQL } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { tenants } from '../../../shared/infrastructure/database/schema/tenants';
import { Tenant, type TenantData } from '../domain/tenant';
import type {
  TenantPage,
  TenantRepository,
  TenantSearchCriteria,
} from '../domain/tenant-repository';

/**
 * Structural shape of a persisted tenant row. Declaring it explicitly keeps the
 * Drizzle-specific row type out of the mapping helpers, which are pure and
 * unit-tested without a database.
 */
export interface TenantRow {
  id: string;
  fullName: string;
  phone: string | null;
  secondPhoneNumber: string | null;
  email: string | null;
  nationalIdCardNumber: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export function toTenantData(row: TenantRow): TenantData {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    secondPhoneNumber: row.secondPhoneNumber,
    email: row.email,
    nationalIdCardNumber: row.nationalIdCardNumber,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  };
}

export function toTenantRow(tenant: Tenant): TenantRow {
  return {
    id: tenant.id,
    fullName: tenant.fullName,
    phone: tenant.phone,
    secondPhoneNumber: tenant.secondPhoneNumber,
    email: tenant.email,
    nationalIdCardNumber: tenant.nationalIdCardNumber,
    notes: tenant.notes,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    archivedAt: tenant.archivedAt,
  };
}

export class DrizzleTenantRepository implements TenantRepository {
  constructor(private readonly db: Database) {}

  save(tenant: Tenant): void {
    this.db.insert(tenants).values(toTenantRow(tenant)).run();
  }

  update(tenant: Tenant): void {
    this.db
      .update(tenants)
      .set({
        fullName: tenant.fullName,
        phone: tenant.phone,
        secondPhoneNumber: tenant.secondPhoneNumber,
        email: tenant.email,
        nationalIdCardNumber: tenant.nationalIdCardNumber,
        notes: tenant.notes,
        updatedAt: tenant.updatedAt,
        archivedAt: tenant.archivedAt,
      })
      .where(eq(tenants.id, tenant.id))
      .run();
  }

  findById(id: string): Tenant | null {
    const row = this.db.select().from(tenants).where(eq(tenants.id, id)).get();
    return row ? Tenant.hydrate(toTenantData(row)) : null;
  }

  findActive(criteria: TenantSearchCriteria): TenantPage {
    return this.query(isNull(tenants.archivedAt), criteria);
  }

  findArchived(criteria: TenantSearchCriteria): TenantPage {
    return this.query(isNotNull(tenants.archivedAt), criteria);
  }

  private query(lifecycle: SQL, criteria: TenantSearchCriteria): TenantPage {
    const conditions: SQL[] = [lifecycle];
    const search = criteria.search.toLowerCase();
    if (search.length > 0) {
      const pattern = `%${search}%`;
      const searchCondition = or(
        like(tenants.fullName, pattern),
        like(tenants.phone, pattern),
        like(tenants.secondPhoneNumber, pattern),
        like(tenants.email, pattern),
      );
      if (searchCondition !== undefined) {
        conditions.push(searchCondition);
      }
    }
    const where = and(...conditions);

    const rows = this.db
      .select()
      .from(tenants)
      .where(where)
      .orderBy(tenants.createdAt)
      .limit(criteria.limit)
      .offset(criteria.offset)
      .all()
      .map((row) => Tenant.hydrate(toTenantData(row)));

    const total = this.db.select({ value: count() }).from(tenants).where(where).get()?.value ?? 0;

    return { tenants: rows, total };
  }
}
