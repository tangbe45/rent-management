import { PropertyNotFoundError } from './errors';
import {
  FakeClock,
  InMemoryPropertyRepository,
  activeProperty,
  archivedProperty,
} from './test-support';
import { UpdateProperty } from './update-property';

function build(seedProperty = activeProperty('prop-1')) {
  const properties = new InMemoryPropertyRepository();
  properties.save(seedProperty);
  const clock = new FakeClock(7000);
  return { properties, clock, updateProperty: new UpdateProperty({ properties, clock }) };
}

describe('UpdateProperty', () => {
  it('updates the editable fields, timestamps and persists the change', () => {
    const { properties, updateProperty } = build();

    const updated = updateProperty.execute({
      id: 'prop-1',
      name: '  Renamed  ',
      address: 'New address',
      description: 'A note',
    });

    expect(updated.name).toBe('Renamed');
    expect(updated.address).toBe('New address');
    expect(updated.description).toBe('A note');
    expect(updated.updatedAt).toBe(7000);
    expect(updated.id).toBe('prop-1');
    expect(updated.createdAt).toBe(1);
    expect(properties.findById('prop-1')?.name).toBe('Renamed');
  });

  it('throws when the property does not exist', () => {
    const { updateProperty } = build();
    expect(() =>
      updateProperty.execute({ id: 'missing', name: 'X', address: 'Y' }),
    ).toThrow(PropertyNotFoundError);
  });

  it('does not change the lifecycle state of an archived property', () => {
    const { updateProperty } = build(archivedProperty('prop-2'));
    const updated = updateProperty.execute({ id: 'prop-2', name: 'Still archived', address: 'Y' });

    expect(updated.isArchived).toBe(true);
    expect(updated.archivedAt).toBe(2);
  });

  it('propagates domain validation', () => {
    const { updateProperty } = build();
    expect(() => updateProperty.execute({ id: 'prop-1', name: '   ', address: 'Y' })).toThrow(
      /name is required/,
    );
  });
});