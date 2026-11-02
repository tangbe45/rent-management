import {
  InvalidPropertySpaceNameError,
  InvalidPropertySpaceParentError,
  InvalidPropertySpaceTypeError,
  PROPERTY_SPACE_NAME_MAX_LENGTH,
  PropertySpace,
  PropertySpaceAlreadyActiveError,
  PropertySpaceArchivedError,
} from './property-space';

function build(overrides: Partial<Parameters<typeof PropertySpace.create>[0]> = {}) {
  return PropertySpace.create({
    id: 'space-1',
    propertyId: 'property-1',
    name: 'Main Building',
    type: 'BUILDING',
    rentable: false,
    createdAt: 1000,
    ...overrides,
  });
}

describe('PropertySpace', () => {
  it('creates a valid root space and derives lifecycle from archivedAt', () => {
    const space = build();

    expect(space.id).toBe('space-1');
    expect(space.propertyId).toBe('property-1');
    expect(space.parentSpaceId).toBeNull();
    expect(space.name).toBe('Main Building');
    expect(space.type).toBe('BUILDING');
    expect(space.rentable).toBe(false);
    expect(space.createdAt).toBe(1000);
    expect(space.updatedAt).toBe(1000);
    expect(space.archivedAt).toBeNull();
    expect(space.isActive).toBe(true);
    expect(space.isArchived).toBe(false);
  });

  it('trims the name and rejects a blank name', () => {
    expect(build({ name: '  Room 1  ' }).name).toBe('Room 1');
    expect(() => build({ name: '   ' })).toThrow(InvalidPropertySpaceNameError);
  });

  it('rejects a name longer than the maximum length', () => {
    const tooLong = 'a'.repeat(PROPERTY_SPACE_NAME_MAX_LENGTH + 1);
    expect(() => build({ name: tooLong })).toThrow(InvalidPropertySpaceNameError);
  });

  it('accepts every controlled type and rejects an unknown one', () => {
    expect(build({ type: 'ROOM', rentable: true }).type).toBe('ROOM');
    expect(build({ type: 'WAREHOUSE' }).type).toBe('WAREHOUSE');
    expect(() => build({ type: 'GARDEN' })).toThrow(InvalidPropertySpaceTypeError);
  });

  it('allows a rentable parent to also contain children', () => {
    const parent = build({ id: 'house', type: 'BUILDING', rentable: true });
    const child = build({ id: 'room', parentSpaceId: 'house', type: 'ROOM', rentable: true });

    expect(parent.rentable).toBe(true);
    expect(child.parentSpaceId).toBe('house');
  });

  it('rejects a space being its own parent', () => {
    expect(() =>
      PropertySpace.create({
        id: 'space-1',
        propertyId: 'property-1',
        parentSpaceId: 'space-1',
        name: 'Loop',
        type: 'ROOM',
        rentable: false,
        createdAt: 1,
      }),
    ).toThrow(InvalidPropertySpaceParentError);
  });

  it('archives by stamping archivedAt and updatedAt without touching identity', () => {
    const archived = build().archive(2000);

    expect(archived.archivedAt).toBe(2000);
    expect(archived.updatedAt).toBe(2000);
    expect(archived.id).toBe('space-1');
    expect(archived.createdAt).toBe(1000);
    expect(archived.isArchived).toBe(true);
    expect(() => archived.archive(3000)).toThrow(PropertySpaceArchivedError);
  });

  it('restores the same identity and clears archivedAt', () => {
    const restored = build().archive(2000).restore(3000);

    expect(restored.id).toBe('space-1');
    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe(3000);
    expect(() => restored.restore(4000)).toThrow(PropertySpaceAlreadyActiveError);
  });

  it('updates name, type and rentable while preserving parent and lifecycle', () => {
    const updated = build({ parentSpaceId: undefined })
      .update({ name: '  Shop 1  ', type: 'SHOP', rentable: true, updatedAt: 5000 });

    expect(updated.name).toBe('Shop 1');
    expect(updated.type).toBe('SHOP');
    expect(updated.rentable).toBe(true);
    expect(updated.parentSpaceId).toBeNull();
    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(5000);
    expect(updated.isActive).toBe(true);
  });

  it('moves an active space to another parent or back to the root', () => {
    const moved = build().moveTo('building-a', 2000);
    expect(moved.parentSpaceId).toBe('building-a');
    expect(moved.updatedAt).toBe(2000);

    expect(moved.moveTo(null, 3000).parentSpaceId).toBeNull();
  });

  it('rejects moving an archived space or onto itself', () => {
    const archived = build().archive(2000);
    expect(() => archived.moveTo('parent', 3000)).toThrow(PropertySpaceArchivedError);
    expect(() => build().moveTo('space-1', 3000)).toThrow(InvalidPropertySpaceParentError);
  });
});