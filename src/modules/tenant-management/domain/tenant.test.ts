import {
  isPlausibleTenantEmail,
  isPlausibleTenantPhone,
  Tenant,
  TenantAlreadyActiveError,
  TenantAlreadyArchivedError,
} from './tenant';

function createTenant(
  overrides: Partial<{
    fullName: string;
    phone: string | null;
    secondPhoneNumber: string | null;
    email: string | null;
    nationalIdCardNumber: string | null;
    notes: string | null;
  }> = {},
) {
  return Tenant.create({
    id: 'tenant-1',
    fullName: overrides.fullName ?? 'Amina Njeri',
    phone: overrides.phone,
    secondPhoneNumber: overrides.secondPhoneNumber,
    email: overrides.email,
    nationalIdCardNumber: overrides.nationalIdCardNumber,
    notes: overrides.notes,
    createdAt: 1000,
  });
}

describe('Tenant creation and normalization', () => {
  it('creates an active tenant with normalized fields and optional values nulled', () => {
    const tenant = createTenant({ fullName: '  Amina Njeri  ' });

    expect(tenant.id).toBe('tenant-1');
    expect(tenant.fullName).toBe('Amina Njeri');
    expect(tenant.phone).toBeNull();
    expect(tenant.secondPhoneNumber).toBeNull();
    expect(tenant.email).toBeNull();
    expect(tenant.nationalIdCardNumber).toBeNull();
    expect(tenant.notes).toBeNull();
    expect(tenant.createdAt).toBe(1000);
    expect(tenant.updatedAt).toBe(1000);
    expect(tenant.archivedAt).toBeNull();
    expect(tenant.isActive).toBe(true);
    expect(tenant.isArchived).toBe(false);
  });

  it('trims provided optional fields', () => {
    const tenant = createTenant({
      phone: '  +254 700 000 000  ',
      secondPhoneNumber: '  0712 345 678  ',
      email: '  amina@example.com  ',
      nationalIdCardNumber: '  0012345  ',
      notes: '  Pays on time  ',
    });

    expect(tenant.phone).toBe('+254 700 000 000');
    expect(tenant.secondPhoneNumber).toBe('0712 345 678');
    expect(tenant.email).toBe('amina@example.com');
    expect(tenant.nationalIdCardNumber).toBe('0012345');
    expect(tenant.notes).toBe('Pays on time');
  });

  it('normalizes blank optional fields to null', () => {
    const tenant = createTenant({
      phone: '   ',
      secondPhoneNumber: '',
      email: '   ',
      nationalIdCardNumber: '   ',
      notes: '   ',
    });

    expect(tenant.phone).toBeNull();
    expect(tenant.secondPhoneNumber).toBeNull();
    expect(tenant.email).toBeNull();
    expect(tenant.nationalIdCardNumber).toBeNull();
    expect(tenant.notes).toBeNull();
  });

  it('preserves leading zeros in a national ID card number', () => {
    expect(createTenant({ nationalIdCardNumber: '000123' }).nationalIdCardNumber).toBe('000123');
  });

  it('accepts letters in a national ID card number', () => {
    expect(createTenant({ nationalIdCardNumber: 'AB-12 34' }).nationalIdCardNumber).toBe('AB-12 34');
  });

  it('rejects an empty full name', () => {
    expect(() => createTenant({ fullName: '' })).toThrow(/name is required/);
  });

  it('rejects a whitespace-only full name', () => {
    expect(() => createTenant({ fullName: '   ' })).toThrow(/name is required/);
  });

  it('rejects an over-long full name', () => {
    expect(() => createTenant({ fullName: 'X'.repeat(121) })).toThrow(/at most 120 characters/);
  });

  it('rejects an implausible email', () => {
    expect(() => createTenant({ email: 'not-an-email' })).toThrow(/is not valid/);
  });

  it('rejects an implausible phone number', () => {
    expect(() => createTenant({ phone: 'call me maybe' })).toThrow(/Phone number may only contain/);
  });
});

describe('Tenant plausibility helpers', () => {
  it('accepts common phone formats and rejects vanity text', () => {
    expect(isPlausibleTenantPhone('+254 700 000 000')).toBe(true);
    expect(isPlausibleTenantPhone('(0712) 345-678')).toBe(true);
    expect(isPlausibleTenantPhone('abcdef')).toBe(false);
  });

  it('accepts a simple email shape and rejects invalid ones', () => {
    expect(isPlausibleTenantEmail('amina@example.com')).toBe(true);
    expect(isPlausibleTenantEmail('amina@localhost')).toBe(false);
    expect(isPlausibleTenantEmail('@example.com')).toBe(false);
  });
});

describe('Tenant lifecycle', () => {
  it('archives an active tenant, setting archivedAt and updatedAt', () => {
    const archived = createTenant().archive(2000);

    expect(archived.isArchived).toBe(true);
    expect(archived.archivedAt).toBe(2000);
    expect(archived.updatedAt).toBe(2000);
  });

  it('rejects archiving an already-archived tenant', () => {
    const archived = createTenant().archive(2000);
    expect(() => archived.archive(3000)).toThrow(TenantAlreadyArchivedError);
  });

  it('restores an archived tenant and clears archivedAt', () => {
    const restored = createTenant().archive(2000).restore(3000);

    expect(restored.isActive).toBe(true);
    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe(3000);
  });

  it('rejects restoring an active tenant', () => {
    expect(() => createTenant().restore(2000)).toThrow(TenantAlreadyActiveError);
  });

  it('preserves id and createdAt through archive and restore', () => {
    const original = createTenant();
    const restored = original.archive(2000).restore(3000);

    expect(restored.id).toBe(original.id);
    expect(restored.createdAt).toBe(original.createdAt);
  });
});

describe('Tenant update', () => {
  it('updates editable fields while preserving identity and lifecycle', () => {
    const updated = createTenant().update({
      fullName: 'Amina Wanjiru',
      phone: '+254 700 111 222',
      email: 'amina.w@example.com',
      updatedAt: 5000,
    });

    expect(updated.id).toBe('tenant-1');
    expect(updated.createdAt).toBe(1000);
    expect(updated.fullName).toBe('Amina Wanjiru');
    expect(updated.phone).toBe('+254 700 111 222');
    expect(updated.email).toBe('amina.w@example.com');
    expect(updated.updatedAt).toBe(5000);
    expect(updated.isActive).toBe(true);
  });

  it('does not restore an archived tenant when editing it', () => {
    const updated = createTenant().archive(2000).update({
      fullName: 'Renamed',
      updatedAt: 5000,
    });

    expect(updated.isArchived).toBe(true);
    expect(updated.archivedAt).toBe(2000);
  });

  it('validates fields on update', () => {
    expect(() => createTenant().update({ fullName: '   ', updatedAt: 5000 })).toThrow(
      /name is required/,
    );
  });

  it('preserves omitted optional fields on a partial update', () => {
    const original = createTenant({
      phone: '+254 700 111 222',
      secondPhoneNumber: '0712 345 678',
      email: 'amina@example.com',
      nationalIdCardNumber: '0012345',
      notes: 'Pays on time',
    });

    const updated = original.update({ fullName: 'Amina Wanjiru', updatedAt: 5000 });

    expect(updated.fullName).toBe('Amina Wanjiru');
    expect(updated.phone).toBe('+254 700 111 222');
    expect(updated.secondPhoneNumber).toBe('0712 345 678');
    expect(updated.email).toBe('amina@example.com');
    expect(updated.nationalIdCardNumber).toBe('0012345');
    expect(updated.notes).toBe('Pays on time');
    expect(updated.updatedAt).toBe(5000);
  });

  it('clears optional fields when they are explicitly null', () => {
    const original = createTenant({
      phone: '+254 700 111 222',
      secondPhoneNumber: '0712 345 678',
      email: 'amina@example.com',
      nationalIdCardNumber: '0012345',
      notes: 'Pays on time',
    });

    const updated = original.update({
      fullName: 'Amina Wanjiru',
      phone: null,
      secondPhoneNumber: null,
      email: null,
      nationalIdCardNumber: null,
      notes: null,
      updatedAt: 5000,
    });

    expect(updated.phone).toBeNull();
    expect(updated.secondPhoneNumber).toBeNull();
    expect(updated.email).toBeNull();
    expect(updated.nationalIdCardNumber).toBeNull();
    expect(updated.notes).toBeNull();
  });

  it('still clears optional fields when they are empty or whitespace-only', () => {
    const original = createTenant({
      phone: '+254 700 111 222',
      secondPhoneNumber: '0712 345 678',
      email: 'amina@example.com',
      nationalIdCardNumber: '0012345',
      notes: 'Pays on time',
    });

    const updated = original.update({
      fullName: 'Amina Wanjiru',
      phone: '',
      secondPhoneNumber: '   ',
      email: '',
      nationalIdCardNumber: '  ',
      notes: '   ',
      updatedAt: 5000,
    });

    expect(updated.phone).toBeNull();
    expect(updated.secondPhoneNumber).toBeNull();
    expect(updated.email).toBeNull();
    expect(updated.nationalIdCardNumber).toBeNull();
    expect(updated.notes).toBeNull();
  });

  it('trims non-blank optional fields on update', () => {
    const updated = createTenant().update({
      fullName: '  Amina Wanjiru  ',
      phone: '  +254 700 111 222  ',
      secondPhoneNumber: '  0712 345 678  ',
      email: '  amina@example.com  ',
      nationalIdCardNumber: '  0012345  ',
      notes: '  Pays on time  ',
      updatedAt: 5000,
    });

    expect(updated.fullName).toBe('Amina Wanjiru');
    expect(updated.phone).toBe('+254 700 111 222');
    expect(updated.secondPhoneNumber).toBe('0712 345 678');
    expect(updated.email).toBe('amina@example.com');
    expect(updated.nationalIdCardNumber).toBe('0012345');
    expect(updated.notes).toBe('Pays on time');
  });

  it('preserves identity, createdAt and archivedAt while bumping updatedAt', () => {
    const archived = createTenant({
      phone: '+254 700 111 222',
      email: 'amina@example.com',
    }).archive(2000);

    const updated = archived.update({ fullName: 'Renamed', updatedAt: 5000 });

    expect(updated.id).toBe('tenant-1');
    expect(updated.createdAt).toBe(1000);
    expect(updated.archivedAt).toBe(2000);
    expect(updated.isArchived).toBe(true);
    expect(updated.updatedAt).toBe(5000);
    expect(updated.phone).toBe('+254 700 111 222');
    expect(updated.email).toBe('amina@example.com');
  });
});

describe('Tenant hydration', () => {
  it('hydrates a persisted tenant, preserving archive state and timestamps', () => {
    const tenant = Tenant.hydrate({
      id: 'tenant-9',
      fullName: 'Family Tenant',
      phone: '0700 000 000',
      secondPhoneNumber: null,
      email: null,
      nationalIdCardNumber: '0001',
      notes: null,
      createdAt: 10,
      updatedAt: 20,
      archivedAt: 30,
    });

    expect(tenant.id).toBe('tenant-9');
    expect(tenant.fullName).toBe('Family Tenant');
    expect(tenant.phone).toBe('0700 000 000');
    expect(tenant.archivedAt).toBe(30);
    expect(tenant.isArchived).toBe(true);
  });
});
