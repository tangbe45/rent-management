import { InvalidPropertySpaceParentError, PropertySpaceArchivedError } from '../domain/property-space';
import { MovePropertySpace } from './move-property-space';
import {
  PropertySpaceCycleError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceNotFoundError,
  PropertySpaceParentArchivedError,
  PropertySpaceParentMismatchError,
} from './property-space-errors';
import { InMemoryPropertySpaceRepository, spaceAt } from './property-space-test-support';
import { FakeClock } from './test-support';

function build() {
  const spaces = new InMemoryPropertySpaceRepository();
  const clock = new FakeClock(7000);
  const moveSpace = new MovePropertySpace({ spaces, clock });
  return { spaces, moveSpace };
}

describe('MovePropertySpace', () => {
  it('moves a space under a new active parent and back to the root', () => {
    const { spaces, moveSpace } = build();
    spaces.save(spaceAt({ id: 'a' }));
    spaces.save(spaceAt({ id: 'b' }));

    const moved = moveSpace.execute({ id: 'a', parentSpaceId: 'b' });
    expect(moved.parentSpaceId).toBe('b');
    expect(moved.updatedAt).toBe(7000);
    expect(moved.propertyId).toBe('property-1');

    expect(moveSpace.execute({ id: 'a', parentSpaceId: null }).parentSpaceId).toBeNull();
  });

  it('rejects an unknown space or parent and self-parenting', () => {
    const { spaces, moveSpace } = build();
    spaces.save(spaceAt({ id: 'a' }));

    expect(() => moveSpace.execute({ id: 'missing', parentSpaceId: null })).toThrow(
      PropertySpaceNotFoundError,
    );
    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: 'missing' })).toThrow(
      PropertySpaceNotFoundError,
    );
    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: 'a' })).toThrow(
      InvalidPropertySpaceParentError,
    );
  });

  it('rejects an archived or cross-property destination parent', () => {
    const { spaces, moveSpace } = build();
    spaces.save(spaceAt({ id: 'a' }));
    spaces.save(spaceAt({ id: 'archived-parent' }).archive(2));
    spaces.save(spaceAt({ id: 'other-property', propertyId: 'property-2' }));

    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: 'archived-parent' })).toThrow(
      PropertySpaceParentArchivedError,
    );
    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: 'other-property' })).toThrow(
      PropertySpaceParentMismatchError,
    );
  });

  it('prevents moving a space beneath one of its own descendants', () => {
    const { spaces, moveSpace } = build();
    spaces.save(spaceAt({ id: 'a' }));
    spaces.save(spaceAt({ id: 'b', parentSpaceId: 'a' }));
    spaces.save(spaceAt({ id: 'c', parentSpaceId: 'b' }));

    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: 'c' })).toThrow(PropertySpaceCycleError);
    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: 'b' })).toThrow(PropertySpaceCycleError);
  });

  it('rejects a move that clashes with an active sibling name', () => {
    const { spaces, moveSpace } = build();
    spaces.save(spaceAt({ id: 'a', name: 'Room 1' }));
    spaces.save(spaceAt({ id: 'parent', name: 'Floor 1' }));
    spaces.save(spaceAt({ id: 'taken', parentSpaceId: 'parent', name: 'Room 1' }));

    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: 'parent' })).toThrow(
      PropertySpaceNameAlreadyExistsError,
    );
  });

  it('rejects moving an archived space', () => {
    const { spaces, moveSpace } = build();
    spaces.save(spaceAt({ id: 'a' }).archive(2));

    expect(() => moveSpace.execute({ id: 'a', parentSpaceId: null })).toThrow(
      PropertySpaceArchivedError,
    );
  });
});