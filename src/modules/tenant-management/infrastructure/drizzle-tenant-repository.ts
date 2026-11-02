import { and, count, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';

import {
  normalizeSearchText,
  SEARCH_FIELD_SEPARATOR_CODE_POINT,
  SEARCH_TEXT_FOLDS,
} from '../../../shared/domain/search-text';
import type { Database } from '../../../shared/infrastructure/database/connection';
import { tenants } from '../../../shared/infrastructure/database/schema/tenants';
import { Tenant, type TenantData } from '../domain/tenant';
import type {
  TenantPage,
  TenantRepository,
  TenantSearchCriteria,
} from '../domain/tenant-repository';

const LIKE_ESCAPE_CHARACTER = '\\';

/**
 * Escapes the characters SQLite's `LIKE` treats as special so a user's search
 * term matches literally: `\` becomes `\\`, `%` becomes `\%` and `_` becomes
 * `\_`. One pass over the original characters avoids the double-escaping a
 * chain of `replace` calls would introduce (`\` → `\\` → `\\\\`).
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `${LIKE_ESCAPE_CHARACTER}${character}`);
}

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Builds a SQLite expression that produces exactly the text
 * `buildSearchableText` produces in JavaScript: the four searchable fields
 * joined by the field separator, then folded and lower-cased.
 *
 * `LOWER()` is ASCII-only in SQLite, so non-ASCII case and diacritics are
 * removed by the `replace` chain generated from the shared fold table. Applying
 * `LOWER()` afterwards mirrors the ASCII-only case folding performed by
 * `normalizeSearchText`, keeping both representations identical for every
 * input rather than only for ASCII.
 */
function tenantSearchText(): SQL {
  const separator = sql.raw(`char(${SEARCH_FIELD_SEPARATOR_CODE_POINT})`);
  let expression = sql`coalesce(${tenants.fullName}, '')`;
  for (const column of [tenants.phone, tenants.secondPhoneNumber, tenants.email]) {
    expression = sql`${expression} || ${separator} || coalesce(${column}, '')`;
  }
  for (const [from, to] of SEARCH_TEXT_FOLDS) {
    expression = sql`replace(${expression}, ${sql.raw(quoteSqlString(from))}, ${sql.raw(quoteSqlString(to))})`;
  }
  return sql`lower(${expression})`;
}

const TENANT_SEARCH_TEXT = tenantSearchText();

/**
 * Builds the literal substring predicate used by tenant search over full name,
 * phone, second phone and email. Returns `undefined` for an empty normalized
 * term, which lets callers skip the condition entirely. The term is always
 * bound as a parameter; only compile-time fold constants appear in the SQL
 * source.
 */
export function tenantSearchCondition(search: string): SQL | undefined {
  const normalized = normalizeSearchText(search);
  if (normalized.length === 0) {
    return undefined;
  }
  const pattern = `%${escapeLikePattern(normalized)}%`;
  return sql`${TENANT_SEARCH_TEXT} like ${pattern} escape '\\'`;
}

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
    const searchCondition = tenantSearchCondition(criteria.search);
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
    const where = and(...conditions);

    const rows = this.db
      .select()
      .from(tenants)
      .where(where)
      // Ties on `createdAt` are broken by id so offset pagination stays stable.
      .orderBy(tenants.createdAt, tenants.id)
      .limit(criteria.limit)
      .offset(criteria.offset)
      .all()
      .map((row) => Tenant.hydrate(toTenantData(row)));

    const total = this.db.select({ value: count() }).from(tenants).where(where).get()?.value ?? 0;

    return { tenants: rows, total };
  }
}
