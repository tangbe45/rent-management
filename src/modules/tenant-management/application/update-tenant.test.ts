import { Tenant } from '../domain/tenant';
import { TenantNotFoundError } from './errors';
import { FakeClock, InMemoryTenantRepository, activeTenant, archivedTenant } from './test-support';
import { UpdateTenant } from './update-tenant';

function build(seed = activeTenant('tenant-1')) {
  const tenants = new InMemoryTenantRepository();
  tenants.save(seed);
  const clock = new FakeClock(5000);
  return { tenants, updateTenant: new UpdateTenant({ tenants, clock }) };
}

function populatedTenant(id = 'tenant-1'): Tenant {
  return Tenant.create({
    id,
    fullName: 'Amina Njeri',
    phone: '+254 700 111 222',
    secondPhoneNumber: '0712 345 678',
    email: 'amina@example.com',
    nationalIdCardNumber: '0012345',
    notes: 'Pays on time',
    createdAt: 1000,
  });
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

  it('preserves omitted optional fields on a partial update and persists them', () => {
    const { tenants, updateTenant } = build(populatedTenant());

    const updated = updateTenant.execute({ id: 'tenant-1', fullName: 'Amina Wanjiru' });

    expect(updated.fullName).toBe('Amina Wanjiru');
    expect(updated.phone).toBe('+254 700 111 222');
    expect(updated.secondPhoneNumber).toBe('0712 345 678');
    expect(updated.email).toBe('amina@example.com');
    expect(updated.nationalIdCardNumber).toBe('0012345');
    expect(updated.notes).toBe('Pays on time');
    expect(updated.updatedAt).toBe(5000);

    expect(tenants.findById('tenant-1')).toBe(updated);
    expect(tenants.findById('tenant-1')).toMatchObject({
      fullName: 'Amina Wanjiru',
      phone: '+254 700 111 222',
      secondPhoneNumber: '0712 345 678',
      email: 'amina@example.com',
      nationalIdCardNumber: '0012345',
      notes: 'Pays on time',
    });
  });

  it('clears optional fields when they are explicitly null and persists the cleared entity', () => {
    const { tenants, updateTenant } = build(populatedTenant());

    const updated = updateTenant.execute({
      id: 'tenant-1',
      fullName: 'Amina Njeri',
      phone: null,
      secondPhoneNumber: null,
      email: null,
      nationalIdCardNumber: null,
      notes: null,
    });

    expect(updated.phone).toBeNull();
    expect(updated.secondPhoneNumber).toBeNull();
    expect(updated.email).toBeNull();
    expect(updated.nationalIdCardNumber).toBeNull();
    expect(updated.notes).toBeNull();

    expect(tenants.findById('tenant-1')).toBe(updated);
    expect(tenants.findById('tenant-1')).toMatchObject({
      phone: null,
      secondPhoneNumber: null,
      email: null,
      nationalIdCardNumber: null,
      notes: null,
    });
  });

  it('preserves omitted fields while clearing explicitly nulled ones', () => {
    const { tenants, updateTenant } = build(populatedTenant());

    const updated = updateTenant.execute({
      id: 'tenant-1',
      fullName: 'Amina Njeri',
      phone: null,
      notes: null,
    });

    expect(updated.phone).toBeNull();
    expect(updated.notes).toBeNull();
    expect(updated.secondPhoneNumber).toBe('0712 345 678');
    expect(updated.email).toBe('amina@example.com');
    expect(updated.nationalIdCardNumber).toBe('0012345');
    expect(tenants.findById('tenant-1')).toBe(updated);
  });
});
