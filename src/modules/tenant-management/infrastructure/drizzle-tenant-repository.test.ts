import { Tenant } from '../domain/tenant';
import { toTenantData, toTenantRow, type TenantRow } from './drizzle-tenant-repository';

const activeRow: TenantRow = {
  id: 'tenant-1',
  fullName: 'Amina Njeri',
  phone: '0700 000 000',
  secondPhoneNumber: null,
  email: 'amina@example.com',
  nationalIdCardNumber: '000123',
  notes: null,
  createdAt: 1000,
  updatedAt: 1000,
  archivedAt: null,
};

describe('drizzle tenant row mapping', () => {
  it('round-trips an active tenant through the persisted row shape', () => {
    const tenant = Tenant.hydrate(toTenantData(activeRow));

    const row = toTenantRow(tenant);
    expect(row).toEqual(activeRow);

    const restored = Tenant.hydrate(toTenantData(row));
    expect(restored.id).toBe('tenant-1');
    expect(restored.fullName).toBe('Amina Njeri');
    expect(restored.phone).toBe('0700 000 000');
    expect(restored.email).toBe('amina@example.com');
    expect(restored.isActive).toBe(true);
  });

  it('preserves the archived lifecycle through the persisted row shape', () => {
    const archivedRow: TenantRow = { ...activeRow, archivedAt: 2000, updatedAt: 2000 };

    const tenant = Tenant.hydrate(activeRow);
    expect(tenant.isArchived).toBe(false);

    const row = toTenantRow(Tenant.hydrate(archivedRow));
    expect(row.archivedAt).toBe(2000);
    expect(Tenant.hydrate(toTenantData(row)).isArchived).toBe(true);
  });

  it('preserves null optional fields and a leading-zero national ID', () => {
    const row = toTenantRow(
      Tenant.create({
        id: 'tenant-2',
        fullName: 'Brian Otieno',
        nationalIdCardNumber: '0001',
        createdAt: 500,
      }),
    );

    expect(row.phone).toBeNull();
    expect(row.secondPhoneNumber).toBeNull();
    expect(row.email).toBeNull();
    expect(row.notes).toBeNull();
    expect(row.nationalIdCardNumber).toBe('0001');
    expect(Tenant.hydrate(toTenantData(row)).nationalIdCardNumber).toBe('0001');
  });
});
