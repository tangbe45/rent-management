import { PropertySpace } from '../domain/property-space';
import {
  toPropertySpaceData,
  toPropertySpaceRow,
  type PropertySpaceRow,
} from './drizzle-property-space-repository';

const rootRow: PropertySpaceRow = {
  id: 'space-1',
  propertyId: 'property-1',
  parentSpaceId: null,
  name: 'Main Building',
  type: 'BUILDING',
  rentable: true,
  createdAt: 1000,
  updatedAt: 1000,
  archivedAt: null,
};

describe('drizzle property-space row mapping', () => {
  it('round-trips an active root space through the persisted row shape', () => {
    const space = PropertySpace.hydrate(rootRow);

    const row = toPropertySpaceRow(space);
    expect(row).toEqual(rootRow);

    const restored = PropertySpace.hydrate(toPropertySpaceData(row));
    expect(restored.id).toBe('space-1');
    expect(restored.propertyId).toBe('property-1');
    expect(restored.parentSpaceId).toBeNull();
    expect(restored.type).toBe('BUILDING');
    expect(restored.rentable).toBe(true);
    expect(restored.archivedAt).toBeNull();
  });

  it('preserves a nullable parent, the boolean rentable and the archived lifecycle', () => {
    const childRow: PropertySpaceRow = {
      ...rootRow,
      id: 'space-2',
      parentSpaceId: 'space-1',
      name: 'Room 1',
      type: 'ROOM',
      rentable: false,
      archivedAt: 2000,
      updatedAt: 2000,
    };

    const row = toPropertySpaceRow(PropertySpace.hydrate(childRow));
    expect(row.parentSpaceId).toBe('space-1');
    expect(row.rentable).toBe(false);
    expect(row.archivedAt).toBe(2000);

    const restored = PropertySpace.hydrate(toPropertySpaceData(row));
    expect(restored.parentSpaceId).toBe('space-1');
    expect(restored.rentable).toBe(false);
    expect(restored.isArchived).toBe(true);
  });

  it('maps every controlled type through the row shape', () => {
    const types = [
      'BUILDING',
      'FLOOR',
      'APARTMENT',
      'STUDIO',
      'ROOM',
      'SHOP',
      'OFFICE',
      'WAREHOUSE',
      'OTHER',
    ] as const;

    for (const type of types) {
      const row = toPropertySpaceRow(PropertySpace.hydrate({ ...rootRow, type }));
      expect(row.type).toBe(type);
      expect(PropertySpace.hydrate(toPropertySpaceData(row)).type).toBe(type);
    }
  });
});