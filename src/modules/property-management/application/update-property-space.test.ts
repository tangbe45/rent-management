import { InvalidPropertySpaceNameError, InvalidPropertySpaceTypeError } from '../domain/property-space';
import { PropertySpaceNameAlreadyExistsError, PropertySpaceNotFoundError } from './property-space-errors';
import { InMemoryPropertySpaceRepository, spaceAt } from './property-space-test-support';
import { FakeClock } from './test-support';
import { UpdatePropertySpace } from './update-property-space';

function build() {
  const spaces = new InMemoryPropertySpaceRepository();
  const clock = new FakeClock(4000);
  const updateSpace = new UpdatePropertySpace({ spaces, clock });
  return { spaces, updateSpace };
}

describe('UpdatePropertySpace', () => {
  it('updates name, type and rentable while keeping structure and lifecycle', () => {
    const { spaces, updateSpace } = build();
    spaces.save(spaceAt({ id: 'a', parentSpaceId: 'parent', name: 'Old', type: 'ROOM' }));

    const updated = updateSpace.execute({ id: 'a', name: '  Shop 1  ', type: 'SHOP', rentable: true });

    expect(updated.name).toBe('Shop 1');
    expect(updated.type).toBe('SHOP');
    expect(updated.rentable).toBe(true);
    expect(updated.parentSpaceId).toBe('parent');
    expect(updated.createdAt).toBe(1);
    expect(updated.updatedAt).toBe(4000);
    expect(spaces.findById('a')).toBe(updated);
  });

  it('rejects an unknown space', () => {
    const { updateSpace } = build();
    expect(() => updateSpace.execute({ id: 'missing', name: 'X', type: 'ROOM', rentable: false })).toThrow(
      PropertySpaceNotFoundError,
    );
  });

  it('rejects a name already used by an active sibling', () => {
    const { spaces, updateSpace } = build();
    spaces.save(spaceAt({ id: 'a', name: 'Room 1' }));
    spaces.save(spaceAt({ id: 'b', name: 'Room 2' }));

    expect(() => updateSpace.execute({ id: 'a', name: 'Room 2', type: 'ROOM', rentable: false })).toThrow(
      PropertySpaceNameAlreadyExistsError,
    );
  });

  it('allows keeping its own name', () => {
    const { spaces, updateSpace } = build();
    spaces.save(spaceAt({ id: 'a', name: 'Room 1' }));

    expect(updateSpace.execute({ id: 'a', name: 'Room 1', type: 'ROOM', rentable: true }).rentable).toBe(true);
  });

  it('propagates domain validation for name and type', () => {
    const { spaces, updateSpace } = build();
    spaces.save(spaceAt({ id: 'a' }));

    expect(() => updateSpace.execute({ id: 'a', name: '  ', type: 'ROOM', rentable: false })).toThrow(
      InvalidPropertySpaceNameError,
    );
    expect(() => updateSpace.execute({ id: 'a', name: 'X', type: 'NOPE', rentable: false })).toThrow(
      InvalidPropertySpaceTypeError,
    );
  });
});