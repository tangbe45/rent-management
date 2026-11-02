import { PropertyAlreadyActiveError } from '../domain/property';
import { PropertyNotFoundError } from './errors';
import { RestoreProperty } from './restore-property';
import { FakeClock, InMemoryPropertyRepository, activeProperty, archivedProperty } from './test-support';

function build(seedProperty = archivedProperty('prop-1')) {
  const properties = new InMemoryPropertyRepository();
  properties.save(seedProperty);
  const clock = new FakeClock(11000);
  return { properties, restoreProperty: new RestoreProperty({ properties, clock }) };
}

describe('RestoreProperty', () => {
  it('restores an archived property, clearing archivedAt', () => {
    const { properties, restoreProperty } = build();

    const restored = restoreProperty.execute({ id: 'prop-1' });

    expect(restored.isActive).toBe(true);
    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe(11000);
    expect(properties.findById('prop-1')?.isActive).toBe(true);
  });

  it('preserves identity and createdAt without creating a new record', () => {
    const { properties, restoreProperty } = build();
    const restored = restoreProperty.execute({ id: 'prop-1' });

    expect(restored.id).toBe('prop-1');
    expect(restored.createdAt).toBe(1);
    expect(properties.all).toHaveLength(1);
  });

  it('throws when the property does not exist', () => {
    const { restoreProperty } = build();
    expect(() => restoreProperty.execute({ id: 'missing' })).toThrow(PropertyNotFoundError);
  });

  it('rejects restoring an already-active property', () => {
    const { restoreProperty } = build(activeProperty('prop-1'));
    expect(() => restoreProperty.execute({ id: 'prop-1' })).toThrow(PropertyAlreadyActiveError);
  });
});