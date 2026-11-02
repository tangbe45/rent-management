import { PropertySpace } from '../domain/property-space';
import type {
  PropertySpaceRepository,
  PropertySpaceSiblingLookup,
} from '../domain/property-space-repository';
import type { SpaceActiveRentalAgreementsQuery } from './space-active-rental-agreements-query';

export class InMemoryPropertySpaceRepository implements PropertySpaceRepository {
  private readonly rows = new Map<string, PropertySpace>();

  save(space: PropertySpace): void {
    this.rows.set(space.id, space);
  }

  update(space: PropertySpace): void {
    this.rows.set(space.id, space);
  }

  findById(id: string): PropertySpace | null {
    return this.rows.get(id) ?? null;
  }

  findByPropertyId(propertyId: string): PropertySpace[] {
    return [...this.rows.values()].filter((space) => space.propertyId === propertyId);
  }

  findActiveSiblingByName(input: PropertySpaceSiblingLookup): PropertySpace | null {
    const match = [...this.rows.values()].find(
      (space) =>
        space.propertyId === input.propertyId &&
        space.parentSpaceId === input.parentSpaceId &&
        space.isActive &&
        space.name === input.name,
    );
    return match ?? null;
  }

  get all(): PropertySpace[] {
    return [...this.rows.values()];
  }
}

export class StubSpaceActiveRentalAgreementsQuery implements SpaceActiveRentalAgreementsQuery {
  constructor(private readonly blockedSpaceIds: ReadonlySet<string> = new Set()) {}

  hasActiveForSpace(spaceId: string): boolean {
    return this.blockedSpaceIds.has(spaceId);
  }
}

export function spaceAt(overrides: {
  id: string;
  propertyId?: string;
  parentSpaceId?: string | null;
  name?: string;
  type?: string;
  rentable?: boolean;
  createdAt?: number;
}): PropertySpace {
  return PropertySpace.create({
    propertyId: 'property-1',
    parentSpaceId: null,
    name: `Space ${overrides.id}`,
    type: 'ROOM',
    rentable: false,
    createdAt: 1,
    ...overrides,
  });
}