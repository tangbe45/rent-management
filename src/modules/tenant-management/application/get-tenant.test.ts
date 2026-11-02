import { GetTenant } from './get-tenant';
import { InMemoryTenantRepository, activeTenant, archivedTenant } from './test-support';

function build() {
  const tenants = new InMemoryTenantRepository();
  tenants.save(activeTenant('active-1'));
  tenants.save(archivedTenant('archived-1'));
  return new GetTenant({ tenants });
}

describe('GetTenant', () => {
  it('returns an active tenant by id', () => {
    expect(build().execute({ id: 'active-1' })?.id).toBe('active-1');
  });

  it('returns an archived tenant by id', () => {
    expect(build().execute({ id: 'archived-1' })?.isArchived).toBe(true);
  });

  it('returns null for a missing tenant', () => {
    expect(build().execute({ id: 'missing' })).toBeNull();
  });
});
