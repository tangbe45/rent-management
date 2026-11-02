import { CreateTenant } from './create-tenant';
import { FakeClock, InMemoryTenantRepository, SequentialIdGenerator } from './test-support';

function build() {
  const tenants = new InMemoryTenantRepository();
  const clock = new FakeClock(5000);
  const createTenant = new CreateTenant({
    tenants,
    clock,
    idGenerator: new SequentialIdGenerator('tenant'),
  });
  return { tenants, createTenant };
}

describe('CreateTenant', () => {
  it('registers, timestamps and persists an active tenant', () => {
    const { tenants, createTenant } = build();

    const tenant = createTenant.execute({
      fullName: '  Amina Njeri  ',
      phone: '  +254 700 000 000  ',
      email: '  amina@example.com  ',
    });

    expect(tenant.id).toBe('tenant-1');
    expect(tenant.fullName).toBe('Amina Njeri');
    expect(tenant.phone).toBe('+254 700 000 000');
    expect(tenant.email).toBe('amina@example.com');
    expect(tenant.createdAt).toBe(5000);
    expect(tenant.isActive).toBe(true);
    expect(tenants.findById('tenant-1')).toBe(tenant);
  });

  it('accepts missing optional fields', () => {
    const { createTenant } = build();
    const tenant = createTenant.execute({ fullName: 'John Doe' });
    expect(tenant.phone).toBeNull();
    expect(tenant.secondPhoneNumber).toBeNull();
    expect(tenant.email).toBeNull();
    expect(tenant.nationalIdCardNumber).toBeNull();
    expect(tenant.notes).toBeNull();
  });

  it('propagates domain validation for a blank name', () => {
    const { createTenant } = build();
    expect(() => createTenant.execute({ fullName: '   ' })).toThrow(/name is required/);
  });
});
