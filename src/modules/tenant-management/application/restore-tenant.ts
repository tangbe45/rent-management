import type { Clock } from '../../../shared/domain/clock';
import type { Tenant } from '../domain/tenant';
import type { TenantRepository } from '../domain/tenant-repository';
import { TenantNotFoundError } from './errors';

export interface RestoreTenantInput {
  id: string;
}

/**
 * Restores an archived tenant by clearing `archivedAt`. The id, `createdAt` and
 * historical identity are preserved and no new record is created.
 */
export class RestoreTenant {
  constructor(
    private readonly deps: {
      tenants: TenantRepository;
      clock: Clock;
    },
  ) {}

  execute(input: RestoreTenantInput): Tenant {
    const tenant = this.deps.tenants.findById(input.id);
    if (tenant === null) {
      throw new TenantNotFoundError(input.id);
    }
    const restored = tenant.restore(this.deps.clock.now());
    this.deps.tenants.update(restored);
    return restored;
  }
}
