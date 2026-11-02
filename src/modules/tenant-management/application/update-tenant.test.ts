import { TenantNotFoundError } from './errors';
import { FakeClock, InMemoryTenantRepository, activeTenant, archivedTenant } from './test-support';
import { UpdateTenant } from './update-tenant';

function build(seed = activeTenant('tenant-1')) {
  const tenants = new InMemoryTenantRepository();
  tenants.save(seed);
  const clock = new FakeClock(5000);
  return { tenants, updateTenant: new UpdateTenant({ tenants, clock }) };
}

describe('UpdateTenant', () => {
  it('updates editable fields, timestamps and persists them', () => {
    const { tenants, updateTenant } = build();

    const updated = updateTenant.execute({
      id: 'tenant-1',
      fullName: '  Amina Wanjiru  ',
      phone: '  +254 700 111 222  ',
      email: '  amina.w@example.com  ',
    });

    expect(updated.id).toBe('tenant-1');
    expect(updated.createdAt).toBe(1000);
    expect(updated.fullName).toBe('Amina Wanjiru');
    expect(updated.phone).toBe('+254 700 111 222');
    expect(updated.email).toBe('amina.w@example.com');
    expect(updated.updatedAt).toBe(5000);
    expect(tenants.findById('tenant-1')).toBe(updated);
  });

  it('throws when the tenant does not exist', () => {
    const { updateTenant } = build();
    expect(() => updateTenant.execute({ id: 'missing', fullName: 'Anyone' })).toThrow(
      TenantNotFoundError,
    );
  });

  it('preserves identity and archive state when editing an archived tenant', () => {
    const { updateTenant } = build(archivedTenant('tenant-2'));

    const updated = updateTenant.execute({ id: 'tenant-2', fullName: 'Renamed' });

    expect(updated.id).toBe('tenant-2');
    expect(updated.createdAt).toBe(1000);
    expect(updated.isArchived).toBe(true);
    expect(updated.archivedAt).toBe(1001);
  });

  it('propagates domain validation', () => {
    const { updateTenant } = build();
    expect(() => updateTenant.execute({ id: 'tenant-1', fullName: '   ' })).toThrow(
      /name is required/,
    );
  });
});
