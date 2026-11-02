import { Tenant } from '../domain/tenant';
import { ListArchivedTenants } from './list-archived-tenants';
import { ListTenants } from './list-tenants';
import { InMemoryTenantRepository } from './test-support';

function seed() {
  const tenants = new InMemoryTenantRepository();
  tenants.save(
    Tenant.create({ id: 't1', fullName: 'Amina Njeri', phone: '0700 111 111', createdAt: 1 }),
  );
  tenants.save(
    Tenant.create({ id: 't2', fullName: 'Brian Otieno', email: 'brian@example.com', createdAt: 2 }),
  );
  tenants.save(
    Tenant.create({ id: 't3', fullName: 'Carla Mwangi', secondPhoneNumber: '0712 999 999', createdAt: 3 }),
  );
  tenants.save(Tenant.create({ id: 'a1', fullName: 'Archived Person', createdAt: 4 }).archive(5));
  return tenants;
}

function ids(tenants: Tenant[]): string[] {
  return tenants.map((tenant) => tenant.id);
}

describe('ListTenants', () => {
  it('returns active tenants only, in insertion order', () => {
    const result = new ListTenants({ tenants: seed() }).execute();
    expect(ids(result.tenants)).toEqual(['t1', 't2', 't3']);
    expect(result.total).toBe(3);
  });

  it('returns an empty page when everything is archived', () => {
    const tenants = new InMemoryTenantRepository();
    tenants.save(Tenant.create({ id: 'a1', fullName: 'Archived', createdAt: 1 }).archive(2));
    expect(new ListTenants({ tenants }).execute()).toEqual({ tenants: [], total: 0 });
  });

  it('searches by full name, case-insensitively', () => {
    const result = new ListTenants({ tenants: seed() }).execute({ search: 'otieno' });
    expect(ids(result.tenants)).toEqual(['t2']);
  });

  it('searches by phone number', () => {
    expect(ids(new ListTenants({ tenants: seed() }).execute({ search: '0700' }).tenants)).toEqual([
      't1',
    ]);
  });

  it('searches by second phone number', () => {
    const result = new ListTenants({ tenants: seed() }).execute({ search: '0712' });
    expect(ids(result.tenants)).toEqual(['t3']);
  });

  it('searches by email', () => {
    const result = new ListTenants({ tenants: seed() }).execute({ search: 'brian@example.com' });
    expect(ids(result.tenants)).toEqual(['t2']);
  });

  it('paginates while reporting the total number of matches', () => {
    const listTenants = new ListTenants({ tenants: seed() });

    const firstPage = listTenants.execute({ limit: 2 });
    expect(ids(firstPage.tenants)).toEqual(['t1', 't2']);
    expect(firstPage.total).toBe(3);

    const secondPage = listTenants.execute({ limit: 2, offset: 2 });
    expect(ids(secondPage.tenants)).toEqual(['t3']);
    expect(secondPage.total).toBe(3);
  });

  it('trims the search term before querying', () => {
    const result = new ListTenants({ tenants: seed() }).execute({ search: '  carla  ' });
    expect(ids(result.tenants)).toEqual(['t3']);
  });
});

describe('ListArchivedTenants', () => {
  it('returns archived tenants only', () => {
    const result = new ListArchivedTenants({ tenants: seed() }).execute();
    expect(ids(result.tenants)).toEqual(['a1']);
    expect(result.total).toBe(1);
  });

  it('searches within archived tenants', () => {
    const result = new ListArchivedTenants({ tenants: seed() }).execute({ search: 'person' });
    expect(ids(result.tenants)).toEqual(['a1']);
  });
});
