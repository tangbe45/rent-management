import type { Tenant } from '../domain/tenant';
import type { TenantRepository } from '../domain/tenant-repository';

export interface GetTenantInput {
  id: string;
}

/**
 * Retrieves a tenant by ID. Both active and archived tenants are retrievable.
 * Returns `null` when the tenant does not exist so presentation renders a
 * not-found state instead of treating it as an exception.
 */
export class GetTenant {
  constructor(private readonly deps: { tenants: TenantRepository }) {}

  execute(input: GetTenantInput): Tenant | null {
    return this.deps.tenants.findById(input.id);
  }
}
