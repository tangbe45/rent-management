import { RestoreTenant } from './restore-tenant';
import { TenantNotFoundError } from './errors';
import { TenantAlreadyActiveError } from '../domain/tenant';
import { FakeClock, InMemoryTenantRepository, activeTenant, archivedTenant } from './test-support';

function build(seed = archivedTenant('tenant-1')) {
  const tenants = new InMemoryTenantRepository();
  tenants.save(seed);
  const clock = new FakeClock(7000);
  return { tenants, restoreTenant: new RestoreTenant({ tenants, clock }) };
}

describe('RestoreTenant', () => {
  it('restores an archived tenant and clears archivedAt', () => {
    const { tenants, restoreTenant } = build();

    const restored = restoreTenant.execute({ id: 'tenant-1' });

    expect(restored.isActive).toBe(true);
    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe(7000);
    expect(tenants.findById('tenant-1')?.isActive).toBe(true);
  });

  it('preserves identity and createdAt across restore', () => {
    const { restoreTenant } = build();
    const restored = restoreTenant.execute({ id: 'tenant-1' });

    expect(restored.id).toBe('tenant-1');
    expect(restored.createdAt).toBe(1000);
  });

  it('throws when the tenant does not exist', () => {
    const { restoreTenant } = build();
    expect(() => restoreTenant.execute({ id: 'missing' })).toThrow(TenantNotFoundError);
  });

  it('rejects restoring an active tenant', () => {
    const { restoreTenant } = build(activeTenant('tenant-3'));
    expect(() => restoreTenant.execute({ id: 'tenant-3' })).toThrow(TenantAlreadyActiveError);
  });
});
