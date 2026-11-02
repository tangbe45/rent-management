import type { Tenant } from './tenant';

/**
 * Default page size for tenant lists. Tenant lists are the first lists in the
 * application that support searching and pagination, so the page size lives
 * with the port and both repository implementations apply the same default.
 */
export const DEFAULT_TENANT_PAGE_SIZE = 20;

export interface TenantQuery {
  /** Free-text search over full name, phone, second phone and email. */
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TenantSearchCriteria {
  search: string;
  limit: number;
  offset: number;
}

export interface TenantPage {
  tenants: Tenant[];
  total: number;
}

export function normalizeTenantQuery(query: TenantQuery = {}): TenantSearchCriteria {
  const limit =
    query.limit !== undefined && query.limit > 0
      ? Math.floor(query.limit)
      : DEFAULT_TENANT_PAGE_SIZE;
  const offset =
    query.offset !== undefined && query.offset > 0 ? Math.floor(query.offset) : 0;
  return { search: (query.search ?? '').trim(), limit, offset };
}

/**
 * Tenant repository port. `save` inserts, `update` rewrites by id. Lifecycle is
 * derived from `archivedAt`, so active and archived lists are queried
 * separately. Both lists support a free-text search and pagination via
 * `TenantSearchCriteria`, applied identically by every implementation.
 */
export interface TenantRepository {
  save(tenant: Tenant): void;
  update(tenant: Tenant): void;
  findById(id: string): Tenant | null;
  findActive(criteria: TenantSearchCriteria): TenantPage;
  findArchived(criteria: TenantSearchCriteria): TenantPage;
}
