import { PropertySpaceAlreadyActiveError } from '../domain/property-space';
import { archivedProperty, activeProperty, FakeClock, InMemoryPropertyRepository } from './test-support';
import { PropertyNotFoundError } from './errors';
import {
  PropertyArchivedError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceNotFoundError,
  PropertySpaceParentArchivedError,
} from './property-space-errors';
import { InMemoryPropertySpaceRepository, spaceAt } from './property-space-test-support';import { RestorePropertySpace } from './restore-property-space';

function build(withProperty = true, propertyArchived = false) {
  const spaces = new InMemoryPropertySpaceRepository();
  const properties = new InMemoryPropertyRepository();
  if (withProperty) {
    properties.save(propertyArchived ? archivedProperty('property-1') : activeProperty('property-1'));
  }
  const clock = new FakeClock(6000);
  const restoreSpace = new RestorePropertySpace({ spaces, properties, clock });
  return { spaces, properties, restoreSpace };
}

describe('RestorePropertySpace', () => {
  it('restores an archived space with the same identity', () => {
    const { spaces, restoreSpace } = build();
    const archived = spaceAt({ id: 'a' }).archive(2);
    spaces.save(archived);

    const restored = restoreSpace.execute({ id: 'a' });

    expect(restored.id).toBe('a');
    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe(6000);
    expect(restored.rentable).toBe(archived.rentable);
  });

  it('rejects unknown or already-active spaces', () => {
    const { spaces, restoreSpace } = build();
    spaces.save(spaceAt({ id: 'active' }));

    expect(() => restoreSpace.execute({ id: 'missing' })).toThrow(PropertySpaceNotFoundError);
    expect(() => restoreSpace.execute({ id: 'active' })).toThrow(PropertySpaceAlreadyActiveError);
  });

  it('requires the owning property to exist and be active', () => {
    const missingProperty = build(false);
    missingProperty.spaces.save(spaceAt({ id: 'a' }).archive(2));
    expect(() => missingProperty.restoreSpace.execute({ id: 'a' })).toThrow(PropertyNotFoundError);

    const archivedPropertyCtx = build(true, true);
    archivedPropertyCtx.spaces.save(spaceAt({ id: 'a' }).archive(2));
    expect(() => archivedPropertyCtx.restoreSpace.execute({ id: 'a' })).toThrow(PropertyArchivedError);
  });

  it('requires the parent to still be active', () => {
    const { spaces, restoreSpace } = build();
    spaces.save(spaceAt({ id: 'parent' }).archive(2));
    spaces.save(spaceAt({ id: 'child', parentSpaceId: 'parent' }).archive(2));

    expect(() => restoreSpace.execute({ id: 'child' })).toThrow(PropertySpaceParentArchivedError);
  });

  it('rejects a name already used by an active sibling', () => {
    const { spaces, restoreSpace } = build();
    spaces.save(spaceAt({ id: 'active', name: 'Room 1' }));
    spaces.save(spaceAt({ id: 'old', name: 'Room 1' }).archive(2));

    expect(() => restoreSpace.execute({ id: 'old' })).toThrow(PropertySpaceNameAlreadyExistsError);
  });

  it('does not restore descendants automatically', () => {
    const { spaces, restoreSpace } = build();
    spaces.save(spaceAt({ id: 'parent' }).archive(2));
    spaces.save(spaceAt({ id: 'child', parentSpaceId: 'parent' }).archive(2));

    restoreSpace.execute({ id: 'parent' });

    expect(spaces.findById('parent')?.isActive).toBe(true);
    expect(spaces.findById('child')?.isArchived).toBe(true);
  });
});