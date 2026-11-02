import type { Clock } from '../../../shared/domain/clock';
import type { Tenant } from '../domain/tenant';
import type { TenantRepository } from '../domain/tenant-repository';
import { TenantNotFoundError } from './errors';

/**
 * Editable tenant fields. `fullName` is required; the optional fields follow a
 * partial-update contract:
 *
 * - omitted (`undefined`) leaves the stored value unchanged;
 * - `null` explicitly clears the value;
 * - an empty or whitespace-only string normalizes to `null`, clearing it;
 * - a non-empty string is trimmed, validated and replaces the stored value.
 */
export interface UpdateTenantInput {
  id: string;
  fullName: string;
  phone?: string | null;
  secondPhoneNumber?: string | null;
  email?: string | null;
  nationalIdCardNumber?: string | null;
  notes?: string | null;
}

/**
 * Updates the editable tenant information. Identity, `createdAt` and lifecycle
 * state are preserved — editing never archives or restores a tenant.
 */
export class UpdateTenant {
  constructor(
    private readonly deps: {
      tenants: TenantRepository;
      clock: Clock;
    },
  ) {}

  execute(input: UpdateTenantInput): Tenant {
    const tenant = this.deps.tenants.findById(input.id);
    if (tenant === null) {
      throw new TenantNotFoundError(input.id);
    }

    const updated = tenant.update({
      fullName: input.fullName,
      phone: input.phone,
      secondPhoneNumber: input.secondPhoneNumber,
      email: input.email,
      nationalIdCardNumber: input.nationalIdCardNumber,
      notes: input.notes,
      updatedAt: this.deps.clock.now(),
    });
    this.deps.tenants.update(updated);
    return updated;
  }
}
