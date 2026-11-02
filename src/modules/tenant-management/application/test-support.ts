import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import { buildSearchableText, normalizeSearchText } from '../../../shared/domain/search-text';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { Tenant } from '../domain/tenant';
import type {
  TenantPage,
  TenantRepository,
  TenantSearchCriteria,
} from '../domain/tenant-repository';
import type { ActiveTenantRentalAgreementsQuery } from './active-tenant-rental-agreements-query';

/**
 * In-memory repository used by application-layer tests. It applies the same
 * search and pagination semantics as the Drizzle implementation so use cases
 * can be tested without a database.
 */
export class InMemoryTenantRepository implements TenantRepository {
  private readonly store = new Map<string, Tenant>();

  save(tenant: Tenant): void {
    this.store.set(tenant.id, tenant);
  }

  update(tenant: Tenant): void {
    this.store.set(tenant.id, tenant);
  }

  findById(id: string): Tenant | null {
    return this.store.get(id) ?? null;
  }

  findActive(criteria: TenantSearchCriteria): TenantPage {
    return this.query(false, criteria);
  }

  findArchived(criteria: TenantSearchCriteria): TenantPage {
    return this.query(true, criteria);
  }

  private query(archived: boolean, criteria: TenantSearchCriteria): TenantPage {
    const search = normalizeSearchText(criteria.search);
    const matching = [...this.store.values()]
      .filter((tenant) => tenant.isArchived === archived)
      .filter((tenant) => matches(tenant, search))
      // Same order as the Drizzle implementation: `createdAt`, then id.
      .sort(compareTenantOrder);

    return {
      tenants: matching.slice(criteria.offset, criteria.offset + criteria.limit),
      total: matching.length,
    };
  }
}

function matches(tenant: Tenant, search: string): boolean {
  if (search.length === 0) {
    return true;
  }
  return searchableTenantText(tenant).includes(search);
}

/**
 * The in-memory equivalent of the Drizzle repository's search column: the same
 * fields, in the same order, joined and normalized by the shared helpers.
 */
function searchableTenantText(tenant: Tenant): string {
  return buildSearchableText([
    tenant.fullName,
    tenant.phone,
    tenant.secondPhoneNumber,
    tenant.email,
  ]);
}

function compareTenantOrder(left: Tenant, right: Tenant): number {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt - right.createdAt;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export class FakeClock implements Clock {
  constructor(private current = 1000) {}

  today(): CalendarDateString {
    return '2026-10-08';
  }

  now(): number {
    return this.current;
  }

  set(value: number): void {
    this.current = value;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private count = 0;

  constructor(private readonly prefix = 'tenant') {}

  next(): string {
    this.count += 1;
    return `${this.prefix}-${this.count}`;
  }
}

export class StubActiveTenantRentalAgreementsQuery implements ActiveTenantRentalAgreementsQuery {
  constructor(private readonly blocked: ReadonlySet<string> = new Set()) {}

  hasActiveForTenant(tenantId: string): boolean {
    return this.blocked.has(tenantId);
  }
}

export function activeTenant(id: string, fullName = `Tenant ${id}`, createdAt = 1000): Tenant {
  return Tenant.create({ id, fullName, createdAt });
}

export function archivedTenant(id: string, fullName = `Tenant ${id}`, createdAt = 1000): Tenant {
  return activeTenant(id, fullName, createdAt).archive(createdAt + 1);
}
