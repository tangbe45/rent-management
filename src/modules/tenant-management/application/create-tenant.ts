import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { Tenant } from '../domain/tenant';
import type { TenantRepository } from '../domain/tenant-repository';

export interface CreateTenantInput {
  fullName: string;
  phone?: string | null;
  secondPhoneNumber?: string | null;
  email?: string | null;
  nationalIdCardNumber?: string | null;
  notes?: string | null;
}

/**
 * Registers a tenant. Validation, normalization and lifecycle defaults live on
 * the `Tenant` entity; this use case only supplies identity and time.
 */
export class CreateTenant {
  constructor(
    private readonly deps: {
      tenants: TenantRepository;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: CreateTenantInput): Tenant {
    const tenant = Tenant.create({
      ...input,
      id: this.deps.idGenerator.next(),
      createdAt: this.deps.clock.now(),
    });
    this.deps.tenants.save(tenant);
    return tenant;
  }
}
