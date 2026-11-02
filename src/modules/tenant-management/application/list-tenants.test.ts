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

  it('searches accent-insensitively and case-insensitively', () => {
    const tenants = new InMemoryTenantRepository();
    tenants.save(Tenant.create({ id: 't1', fullName: 'Élodie Durand', createdAt: 1 }));
    tenants.save(
      Tenant.create({
        id: 't2',
        fullName: 'François Côte',
        secondPhoneNumber: '0712 000 000',
        email: 'francois@example.com',
        createdAt: 2,
      }),
    );
    const listTenants = new ListTenants({ tenants });

    for (const search of ['elodie', 'élodie', 'ÉLODIE']) {
      expect(ids(listTenants.execute({ search }).tenants)).toEqual(['t1']);
    }
    expect(ids(listTenants.execute({ search: 'francois' }).tenants)).toEqual(['t2']);
    expect(ids(listTenants.execute({ search: 'FRANÇOIS@EXAMPLE.COM' }).tenants)).toEqual(['t2']);
    expect(ids(listTenants.execute({ search: 'cote' }).tenants)).toEqual(['t2']);
    expect(ids(listTenants.execute({ search: '0712' }).tenants)).toEqual(['t2']);
    expect(ids(listTenants.execute({ search: 'zzz' }).tenants)).toEqual([]);
  });

  it('preserves the original display values after an accent-insensitive search', () => {
    const tenants = new InMemoryTenantRepository();
    tenants.save(Tenant.create({ id: 't1', fullName: 'Élodie Durand', createdAt: 1 }));

    const result = new ListTenants({ tenants }).execute({ search: 'elodie' });

    expect(result.tenants[0]?.fullName).toBe('Élodie Durand');
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

  it('never returns active tenants, even when the search matches their names', () => {
    const result = new ListArchivedTenants({ tenants: seed() }).execute({ search: 'Amina' });

    expect(ids(result.tenants)).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('searches within archived tenants', () => {
    const result = new ListArchivedTenants({ tenants: seed() }).execute({ search: 'person' });
    expect(ids(result.tenants)).toEqual(['a1']);
  });

  it('searches archived tenants accent-insensitively', () => {
    const tenants = new InMemoryTenantRepository();
    tenants.save(Tenant.create({ id: 'a1', fullName: 'Élodie Archive', createdAt: 1 }).archive(2));

    const result = new ListArchivedTenants({ tenants }).execute({ search: 'ELODIE' });

    expect(ids(result.tenants)).toEqual(['a1']);
    expect(result.total).toBe(1);
  });

  it('treats wildcard characters as literal text in archived searches', () => {
    const tenants = new InMemoryTenantRepository();
    tenants.save(
      Tenant.create({ id: 'a1', fullName: 'Deposit 100% paid', createdAt: 1 }).archive(2),
    );
    tenants.save(
      Tenant.create({ id: 'a2', fullName: 'Unit a_b', createdAt: 2 }).archive(3),
    );
    const listArchivedTenants = new ListArchivedTenants({ tenants });

    expect(ids(listArchivedTenants.execute({ search: '100%' }).tenants)).toEqual(['a1']);
    expect(ids(listArchivedTenants.execute({ search: 'a_b' }).tenants)).toEqual(['a2']);
    expect(ids(listArchivedTenants.execute({ search: '1000' }).tenants)).toEqual([]);
  });

  it('reports the matching total for all pages, not only the loaded page', () => {
    const tenants = new InMemoryTenantRepository();
    for (let index = 0; index < 25; index += 1) {
      tenants.save(
        Tenant.create({
          id: `a${index.toString().padStart(2, '0')}`,
          fullName: `Archived ${index}`,
          createdAt: index,
        }).archive(index + 1),
      );
    }
    const listArchivedTenants = new ListArchivedTenants({ tenants });

    const firstPage = listArchivedTenants.execute({ search: 'archived' });
    expect(firstPage.tenants).toHaveLength(20);
    expect(firstPage.total).toBe(25);

    const nextPage = listArchivedTenants.execute({ search: 'archived', offset: 20 });
    expect(nextPage.tenants).toHaveLength(5);
    expect(nextPage.total).toBe(25);
    expect(ids(firstPage.tenants).concat(ids(nextPage.tenants))).toHaveLength(25);
  });

  it('counts every archived tenant regardless of the search term', () => {
    const listArchivedTenants = new ListArchivedTenants({ tenants: seed() });

    expect(listArchivedTenants.count()).toBe(1);
    expect(listArchivedTenants.execute({ search: 'person' }).total).toBe(1);
    expect(listArchivedTenants.execute({ search: 'zzz' }).total).toBe(0);
    expect(listArchivedTenants.count()).toBe(1);
  });

  it('counts twenty-five archived tenants regardless of the page size', () => {
    const tenants = new InMemoryTenantRepository();
    for (let index = 0; index < 25; index += 1) {
      tenants.save(
        Tenant.create({
          id: `count-${index.toString().padStart(2, '0')}`,
          fullName: `Archived ${index}`,
          createdAt: index,
        }).archive(index + 1),
      );
    }

    expect(new ListArchivedTenants({ tenants }).count()).toBe(25);
  });

  it('counts no archived tenants when every tenant is active', () => {
    expect(new ListArchivedTenants({ tenants: new InMemoryTenantRepository() }).count()).toBe(0);
  });
});
