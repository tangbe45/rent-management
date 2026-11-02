import {
  normalizeTenantQuery,
  type TenantPage,
  type TenantQuery,
  type TenantRepository,
} from '../domain/tenant-repository';

/**
 * Lists active tenants with optional free-text search (full name, phone, second
 * phone, email) and pagination. Archived tenants are never mixed into this list.
 */
export class ListTenants {
  constructor(private readonly deps: { tenants: TenantRepository }) {}

  execute(query: TenantQuery = {}): TenantPage {
    return this.deps.tenants.findActive(normalizeTenantQuery(query));
  }
}
