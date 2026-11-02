import type { Clock } from '../../../shared/domain/clock';
import type { ActiveTenantRentalAgreementsQuery } from '../../tenant-management/application/active-tenant-rental-agreements-query';
import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';

/**
 * Real, agreement-aware replacement for the Tenant Management placeholder. A
 * tenant is protected from archiving while any agreement that has not effectively
 * ended remains (upcoming, active, or with a future termination).
 */
export class PreventTenantArchiveQuery implements ActiveTenantRentalAgreementsQuery {
  constructor(
    private readonly deps: {
      agreements: RentalAgreementRepository;
      clock: Clock;
    },
  ) {}

  hasActiveForTenant(tenantId: string): boolean {
    const today = this.deps.clock.today();
    return this.deps.agreements
      .findAll({ tenantId })
      .some((agreement) => agreement.blocksArchiveOn(today));
  }
}
