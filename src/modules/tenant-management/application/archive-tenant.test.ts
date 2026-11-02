import { ArchiveTenant } from './archive-tenant';
import { ArchiveBlockedByActiveTenantRentalAgreementsError, TenantNotFoundError } from './errors';
import { TenantAlreadyArchivedError } from '../domain/tenant';
import {
  FakeClock,
  InMemoryTenantRepository,
  StubActiveTenantRentalAgreementsQuery,
  activeTenant,
  archivedTenant,
} from './test-support';

function build(seed = activeTenant('tenant-1'), blocked: string[] = []) {
  const tenants = new InMemoryTenantRepository();
  tenants.save(seed);
  const clock = new FakeClock(9000);
  const activeRentalAgreements = new StubActiveTenantRentalAgreementsQuery(new Set(blocked));
  return {
    tenants,
    archiveTenant: new ArchiveTenant({ tenants, activeRentalAgreements, clock }),
  };
}

describe('ArchiveTenant', () => {
  it('archives an active tenant when there are no active rental agreements', () => {
    const { tenants, archiveTenant } = build();

    const archived = archiveTenant.execute({ id: 'tenant-1' });

    expect(archived.isArchived).toBe(true);
    expect(archived.archivedAt).toBe(9000);
    expect(tenants.findById('tenant-1')?.isArchived).toBe(true);
  });

  it('throws when the tenant does not exist', () => {
    const { archiveTenant } = build();
    expect(() => archiveTenant.execute({ id: 'missing' })).toThrow(TenantNotFoundError);
  });

  it('rejects archiving an already-archived tenant', () => {
    const { archiveTenant } = build(archivedTenant('tenant-2'));
    expect(() => archiveTenant.execute({ id: 'tenant-2' })).toThrow(TenantAlreadyArchivedError);
  });

  it('blocks archiving when the tenant has active rental agreements', () => {
    const { archiveTenant } = build(activeTenant('tenant-1'), ['tenant-1']);
    expect(() => archiveTenant.execute({ id: 'tenant-1' })).toThrow(
      ArchiveBlockedByActiveTenantRentalAgreementsError,
    );
  });

  it('leaves the tenant active when archiving is blocked', () => {
    const { tenants, archiveTenant } = build(activeTenant('tenant-1'), ['tenant-1']);

    expect(() => archiveTenant.execute({ id: 'tenant-1' })).toThrow();

    expect(tenants.findById('tenant-1')?.isActive).toBe(true);
  });
});
