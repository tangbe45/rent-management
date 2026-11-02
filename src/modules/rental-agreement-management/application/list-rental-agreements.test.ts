import { ListRentalAgreements } from './list-rental-agreements';
import {
  agreementAt,
  FakeRentalAgreementClock,
  InMemoryRentalAgreementRepository,
  propertyRef,
  spaceRef,
  StubPropertyLookup,
  StubSpaceLookup,
  StubTenantLookup,
  tenantRef,
} from './test-support';

function build() {
  const agreements = new InMemoryRentalAgreementRepository();
  const tenants = new StubTenantLookup([tenantRef('tenant-1'), tenantRef('tenant-2')]);
  const properties = new StubPropertyLookup([propertyRef('property-1'), propertyRef('property-2')]);
  const spaces = new StubSpaceLookup([
    spaceRef({ id: 'space-1', propertyId: 'property-1', name: 'Apartment A' }),
    spaceRef({ id: 'space-2', propertyId: 'property-2', name: 'Shop 2' }),
  ]);
  const clock = new FakeRentalAgreementClock(1, '2026-06-15');
  const list = new ListRentalAgreements({ agreements, tenants, properties, spaces, clock });
  return { agreements, list };
}

describe('ListRentalAgreements', () => {
  it('derives lifecycle and resolves tenant/property/space names', () => {
    const { agreements, list } = build();
    agreements.save(agreementAt({ id: 'a1', startDate: '2026-01-01', endDate: '2026-12-31' }));

    const page = list.execute();

    expect(page.total).toBe(1);
    expect(page.items[0]?.lifecycle).toBe('ACTIVE');
    expect(page.items[0]?.tenantName).toBe('Tenant tenant-1');
    expect(page.items[0]?.spaceName).toBe('Apartment A');
    expect(page.items[0]?.propertyName).toBe('Property property-1');
  });

  it('classifies upcoming, ended and terminated states', () => {
    const { agreements, list } = build();
    agreements.save(agreementAt({ id: 'upcoming', startDate: '2026-08-01' }));
    agreements.save(agreementAt({ id: 'ended', startDate: '2025-01-01', endDate: '2025-06-30' }));
    agreements.save(
      agreementAt({ id: 'terminated', startDate: '2026-01-01', terminationDate: '2026-05-31' }),
    );

    const byId = new Map(list.execute().items.map((item) => [item.agreement.id, item.lifecycle]));
    expect(byId.get('upcoming')).toBe('UPCOMING');
    expect(byId.get('ended')).toBe('ENDED');
    expect(byId.get('terminated')).toBe('TERMINATED');
  });

  it('filters by lifecycle, tenant and space/property', () => {
    const { agreements, list } = build();
    agreements.save(agreementAt({ id: 'a1', tenantId: 'tenant-1', spaceId: 'space-1', startDate: '2026-08-01' }));
    agreements.save(agreementAt({ id: 'a2', tenantId: 'tenant-2', spaceId: 'space-2', startDate: '2026-01-01' }));

    expect(list.execute({ lifecycle: 'UPCOMING' }).items.map((i) => i.agreement.id)).toEqual(['a1']);
    expect(list.execute({ tenantId: 'tenant-2' }).items.map((i) => i.agreement.id)).toEqual(['a2']);
    expect(list.execute({ spaceId: 'space-1' }).items.map((i) => i.agreement.id)).toEqual(['a1']);
    expect(list.execute({ propertyId: 'property-2' }).items.map((i) => i.agreement.id)).toEqual(['a2']);
  });

  it('sorts by start date descending and paginates', () => {
    const { agreements, list } = build();
    agreements.save(agreementAt({ id: 'old', startDate: '2024-01-01' }));
    agreements.save(agreementAt({ id: 'new', startDate: '2026-01-01' }));
    agreements.save(agreementAt({ id: 'mid', startDate: '2025-01-01' }));

    expect(list.execute().items.map((i) => i.agreement.id)).toEqual(['new', 'mid', 'old']);
    const firstPage = list.execute({ limit: 2, offset: 0 });
    expect(firstPage.items.map((i) => i.agreement.id)).toEqual(['new', 'mid']);
    expect(firstPage.total).toBe(3);
    expect(list.execute({ limit: 2, offset: 2 }).items.map((i) => i.agreement.id)).toEqual(['old']);
  });
});
