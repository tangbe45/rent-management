import { PropertySpace } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';
import { GetPropertyWorkspaceOverview } from './get-property-workspace-overview';
import type { SpaceOccupancyQuery, SpaceOccupancySnapshot } from './space-occupancy-query';
import { FakeClock } from './test-support';

function space(id: string, parentSpaceId: string | null = null): PropertySpace {
  return PropertySpace.create({
    id,
    propertyId: 'property-1',
    parentSpaceId,
    name: `Space ${id}`,
    type: 'ROOM',
    rentable: true,
    createdAt: 1,
  });
}

class StubSpaceRepository implements PropertySpaceRepository {
  constructor(private readonly spaces: readonly PropertySpace[]) {}

  save(): void {}
  update(): void {}

  findById(id: string): PropertySpace | null {
    return this.spaces.find((candidate) => candidate.id === id) ?? null;
  }

  findByPropertyId(propertyId: string): PropertySpace[] {
    return this.spaces.filter((candidate) => candidate.propertyId === propertyId);
  }

  findActiveSiblingByName(): PropertySpace | null {
    return null;
  }
}

class SpyOccupancyQuery implements SpaceOccupancyQuery {
  readonly calls: { spaceIds: readonly string[]; today: string }[] = [];

  constructor(private readonly snapshots: readonly SpaceOccupancySnapshot[] = []) {}

  findForSpaces(spaceIds: readonly string[], today: string): SpaceOccupancySnapshot[] {
    this.calls.push({ spaceIds, today });
    return this.snapshots.filter((snapshot) => spaceIds.includes(snapshot.spaceId));
  }
}

describe('GetPropertyWorkspaceOverview', () => {
  it('reads the property spaces and all occupancy facts in a single query', () => {
    const spaces = [space('building'), space('room', 'building')];
    const occupancy = new SpyOccupancyQuery([
      { spaceId: 'room', hasCurrentAgreement: true, hasUpcomingAgreement: false },
    ]);
    const overview = new GetPropertyWorkspaceOverview({
      spaces: new StubSpaceRepository(spaces),
      occupancy,
      clock: new FakeClock(),
    });

    const result = overview.execute({ propertyId: 'property-1' });

    expect(occupancy.calls).toEqual([
      { spaceIds: ['building', 'room'], today: '2026-10-08' },
    ]);
    expect(result.spaces).toEqual(spaces);
    expect(result.availability.get('building')).toBe('AVAILABLE');
    expect(result.availability.get('room')).toBe('OCCUPIED');
    expect(result.summary).toEqual({
      rentableSpaces: 2,
      occupiedSpaces: 1,
      upcomingSpaces: 0,
      availableSpaces: 1,
    });
  });

  it('does not query agreements for a property without spaces', () => {
    const occupancy = new SpyOccupancyQuery();
    const overview = new GetPropertyWorkspaceOverview({
      spaces: new StubSpaceRepository([]),
      occupancy,
      clock: new FakeClock(),
    });

    const result = overview.execute({ propertyId: 'property-1' });

    expect(occupancy.calls).toHaveLength(0);
    expect(result.spaces).toEqual([]);
    expect(result.availability.size).toBe(0);
    expect(result.summary.rentableSpaces).toBe(0);
  });

  it('only asks for spaces of the requested property', () => {
    const mine = space('mine');
    const other = PropertySpace.create({
      id: 'other',
      propertyId: 'property-2',
      name: 'Other',
      type: 'ROOM',
      rentable: true,
      createdAt: 1,
    });
    const occupancy = new SpyOccupancyQuery();
    const overview = new GetPropertyWorkspaceOverview({
      spaces: new StubSpaceRepository([mine, other]),
      occupancy,
      clock: new FakeClock(),
    });

    overview.execute({ propertyId: 'property-1' });

    expect(occupancy.calls[0]?.spaceIds).toEqual(['mine']);
  });
});
