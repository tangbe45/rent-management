import { archivedProperty, activeProperty, FakeClock, InMemoryPropertyRepository, SequentialIdGenerator } from './test-support';
import { CreatePropertySpace } from './create-property-space';
import {
  PropertyArchivedError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceNotFoundError,
  PropertySpaceParentArchivedError,
  PropertySpaceParentMismatchError,
} from './property-space-errors';
import { InMemoryPropertySpaceRepository, spaceAt } from './property-space-test-support';
import { PropertyNotFoundError } from './errors';
import { InvalidPropertySpaceNameError } from '../domain/property-space';

function build() {
  const properties = new InMemoryPropertyRepository();
  properties.save(activeProperty('property-1'));
  const spaces = new InMemoryPropertySpaceRepository();
  const clock = new FakeClock(5000);
  const createSpace = new CreatePropertySpace({
    spaces,
    properties,
    clock,
    idGenerator: new SequentialIdGenerator('space'),
  });
  return { properties, spaces, createSpace };
}

describe('CreatePropertySpace', () => {
  it('creates and persists a root space with normalized values', () => {
    const { spaces, createSpace } = build();

    const space = createSpace.execute({
      propertyId: 'property-1',
      name: '  Main Building  ',
      type: 'BUILDING',
      rentable: true,
    });

    expect(space.id).toBe('space-1');
    expect(space.propertyId).toBe('property-1');
    expect(space.parentSpaceId).toBeNull();
    expect(space.name).toBe('Main Building');
    expect(space.type).toBe('BUILDING');
    expect(space.rentable).toBe(true);
    expect(space.createdAt).toBe(5000);
    expect(spaces.findById('space-1')).toBe(space);
  });

  it('creates a child under an active parent of the same property', () => {
    const { spaces, createSpace } = build();
    spaces.save(spaceAt({ id: 'parent-1', name: 'Ground Floor', type: 'FLOOR' }));

    const child = createSpace.execute({
      propertyId: 'property-1',
      parentSpaceId: 'parent-1',
      name: 'Apartment A',
      type: 'APARTMENT',
      rentable: true,
    });

    expect(child.parentSpaceId).toBe('parent-1');
  });

  it('rejects a missing or archived property', () => {
    const { createSpace } = build();
    expect(() =>
      createSpace.execute({ propertyId: 'missing', name: 'X', type: 'ROOM', rentable: false }),
    ).toThrow(PropertyNotFoundError);

    const archivedProperties = new InMemoryPropertyRepository();
    archivedProperties.save(archivedProperty('property-9'));
    const archivedCreate = new CreatePropertySpace({
      spaces: new InMemoryPropertySpaceRepository(),
      properties: archivedProperties,
      clock: new FakeClock(1),
      idGenerator: new SequentialIdGenerator('space'),
    });
    expect(() =>
      archivedCreate.execute({ propertyId: 'property-9', name: 'X', type: 'ROOM', rentable: false }),
    ).toThrow(PropertyArchivedError);
  });

  it('rejects a missing, archived or cross-property parent', () => {
    const { spaces, createSpace } = build();

    expect(() =>
      createSpace.execute({
        propertyId: 'property-1',
        parentSpaceId: 'missing',
        name: 'X',
        type: 'ROOM',
        rentable: false,
      }),
    ).toThrow(PropertySpaceNotFoundError);

    spaces.save(spaceAt({ id: 'archived-parent' }).archive(2));
    expect(() =>
      createSpace.execute({
        propertyId: 'property-1',
        parentSpaceId: 'archived-parent',
        name: 'X',
        type: 'ROOM',
        rentable: false,
      }),
    ).toThrow(PropertySpaceParentArchivedError);

    spaces.save(spaceAt({ id: 'other-property', propertyId: 'property-2' }));
    expect(() =>
      createSpace.execute({
        propertyId: 'property-1',
        parentSpaceId: 'other-property',
        name: 'X',
        type: 'ROOM',
        rentable: false,
      }),
    ).toThrow(PropertySpaceParentMismatchError);
  });

  it('enforces unique active sibling names per parent', () => {
    const { spaces, createSpace } = build();
    spaces.save(spaceAt({ id: 'existing', name: 'Room 1' }));

    expect(() =>
      createSpace.execute({ propertyId: 'property-1', name: 'Room 1', type: 'ROOM', rentable: false }),
    ).toThrow(PropertySpaceNameAlreadyExistsError);

    spaces.save(spaceAt({ id: 'parent-1' }));
    expect(
      createSpace.execute({
        propertyId: 'property-1',
        parentSpaceId: 'parent-1',
        name: 'Room 1',
        type: 'ROOM',
        rentable: false,
      }).name,
    ).toBe('Room 1');
  });

  it('does not let an archived sibling block an active name', () => {
    const { spaces, createSpace } = build();
    spaces.save(spaceAt({ id: 'old', name: 'Room 1' }).archive(2));

    const space = createSpace.execute({
      propertyId: 'property-1',
      name: 'Room 1',
      type: 'ROOM',
      rentable: false,
    });

    expect(space.name).toBe('Room 1');
  });

  it('propagates domain validation for name and type', () => {
    const { createSpace } = build();
    expect(() =>
      createSpace.execute({ propertyId: 'property-1', name: '   ', type: 'ROOM', rentable: false }),
    ).toThrow(InvalidPropertySpaceNameError);
    expect(() =>
      createSpace.execute({ propertyId: 'property-1', name: 'X', type: 'GARDEN', rentable: false }),
    ).toThrow();
  });
});