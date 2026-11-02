import type { Clock } from '../../../shared/domain/clock';
import { Tenant } from '../domain/tenant';
import type { TenantRepository } from '../domain/tenant-repository';
import { ArchiveBlockedByActiveTenantRentalAgreementsError, TenantNotFoundError } from './errors';
import type { ActiveTenantRentalAgreementsQuery } from './active-tenant-rental-agreements-query';

export interface ArchiveTenantInput {
  id: string;
}

/**
 * Archives an active tenant. Archiving is blocked while the tenant is bound by
 * an active rental agreement, which is answered through the
 * `ActiveTenantRentalAgreementsQuery` port rather than a concrete module.
 */
export class ArchiveTenant {
  constructor(
    private readonly deps: {
      tenants: TenantRepository;
      activeRentalAgreements: ActiveTenantRentalAgreementsQuery;
      clock: Clock;
    },
  ) {}

  execute(input: ArchiveTenantInput): Tenant {
    const tenant = this.deps.tenants.findById(input.id);
    if (tenant === null) {
      throw new TenantNotFoundError(input.id);
    }
    if (this.deps.activeRentalAgreements.hasActiveForTenant(input.id)) {
      throw new ArchiveBlockedByActiveTenantRentalAgreementsError(input.id);
    }

    const archived = tenant.archive(this.deps.clock.now());
    this.deps.tenants.update(archived);
    return archived;
  }
}
