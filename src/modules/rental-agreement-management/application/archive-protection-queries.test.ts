import { PreventPropertyArchiveQuery } from './prevent-property-archive-query';
import { PreventSpaceArchiveQuery } from './prevent-space-archive-query';
import { PreventTenantArchiveQuery } from './prevent-tenant-archive-query';
import {
  agreementAt,
  FakeRentalAgreementClock,
  InMemoryRentalAgreementRepository,
  spaceRef,
  StubSpaceLookup,
} from './test-support';

function build() {
  const agreements = new InMemoryRentalAgreementRepository();
  const spaces = new StubSpaceLookup([
    spaceRef({ id: 'building', propertyId: 'property-1' }),
    spaceRef({ id: 'floor', propertyId: 'property-1', parentSpaceId: 'building' }),
    spaceRef({ id: 'room-1', propertyId: 'property-1', parentSpaceId: 'floor' }),
    spaceRef({ id: 'room-2', propertyId: 'property-1', parentSpaceId: 'floor' }),
  ]);
  const clock = new FakeRentalAgreementClock(1, '2026-06-15');
  return {
    agreements,
    tenant: new PreventTenantArchiveQuery({ agreements, clock }),
    property: new PreventPropertyArchiveQuery({ agreements, spaces, clock }),
    space: new PreventSpaceArchiveQuery({ agreements, spaces, clock }),
  };
}

describe('PreventTenantArchiveQuery', () => {
  it('protects a tenant with an active or upcoming agreement', () => {
    const { agreements, tenant } = build();
    agreements.save(agreementAt({ id: 'active', tenantId: 'tenant-1', startDate: '2026-01-01' }));
    agreements.save(agreementAt({ id: 'upcoming', tenantId: 'tenant-2', startDate: '2026-08-01' }));

    expect(tenant.hasActiveForTenant('tenant-1')).toBe(true);
    expect(tenant.hasActiveForTenant('tenant-2')).toBe(true);
    expect(tenant.hasActiveForTenant('tenant-3')).toBe(false);
  });

  it('does not protect a tenant whose agreements have effectively ended', () => {
    const { agreements, tenant } = build();
    agreements.save(
      agreementAt({ id: 'ended', tenantId: 'tenant-1', startDate: '2025-01-01', endDate: '2025-12-31' }),
    );
    agreements.save(
      agreementAt({
        id: 'terminated',
        tenantId: 'tenant-2',
        startDate: '2025-01-01',
        terminationDate: '2025-06-30',
      }),
    );

    expect(tenant.hasActiveForTenant('tenant-1')).toBe(false);
    expect(tenant.hasActiveForTenant('tenant-2')).toBe(false);
  });
});

describe('PreventPropertyArchiveQuery', () => {
  it('protects a property while any of its spaces carries a live agreement', () => {
    const { agreements, property } = build();
    agreements.save(agreementAt({ id: 'a1', spaceId: 'room-2', startDate: '2026-01-01' }));
    expect(property.hasActiveForProperty('property-1')).toBe(true);
    expect(property.hasActiveForProperty('property-other')).toBe(false);
  });

  it('releases a property once every agreement has effectively ended', () => {
    const { agreements, property } = build();
    agreements.save(
      agreementAt({ id: 'a1', spaceId: 'room-1', startDate: '2025-01-01', endDate: '2025-12-31' }),
    );
    expect(property.hasActiveForProperty('property-1')).toBe(false);
  });
});

describe('PreventSpaceArchiveQuery', () => {
  it('protects the space itself and its ancestors and descendants', () => {
    const onRoom = build();
    onRoom.agreements.save(agreementAt({ id: 'a1', spaceId: 'room-1', startDate: '2026-01-01' }));
    expect(onRoom.space.hasActiveForSpace('room-1')).toBe(true);
    expect(onRoom.space.hasActiveForSpace('floor')).toBe(true);
    expect(onRoom.space.hasActiveForSpace('building')).toBe(true);
    expect(onRoom.space.hasActiveForSpace('room-2')).toBe(false);
  });

  it('protects a parent when a descendant carries a live agreement', () => {
    const { agreements, space } = build();
    agreements.save(agreementAt({ id: 'a1', spaceId: 'room-2', startDate: '2026-08-01' }));
    expect(space.hasActiveForSpace('building')).toBe(true);
  });
});
