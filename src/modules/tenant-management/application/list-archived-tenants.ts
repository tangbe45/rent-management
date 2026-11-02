import {
  normalizeTenantQuery,
  type TenantPage,
  type TenantQuery,
  type TenantRepository,
} from '../domain/tenant-repository';

/**
 * Lists archived tenants with the same search and pagination contract as the
 * active list. Active and archived tenants are never mixed in one list.
 */
export class ListArchivedTenants {
  constructor(private readonly deps: { tenants: TenantRepository }) {}

  execute(query: TenantQuery = {}): TenantPage {
    return this.deps.tenants.findArchived(normalizeTenantQuery(query));
  }
}
