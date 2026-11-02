import { Property } from '../domain/property';
import {
  toPropertyData,
  toPropertyRow,
  type PropertyRow,
} from './drizzle-property-repository';

const activeRow: PropertyRow = {
  id: 'prop-1',
  name: 'Green Valley Estate',
  address: '12 Main Street',
  description: null,
  createdAt: 1000,
  updatedAt: 1000,
  archivedAt: null,
};

describe('drizzle property row mapping', () => {
  it('round-trips an active property through the persisted row shape', () => {
    const property = Property.hydrate(activeRow);

    const row = toPropertyRow(property);
    expect(row).toEqual(activeRow);

    const data = toPropertyData(row);
    const restored = Property.hydrate(data);
    expect(restored.id).toBe('prop-1');
    expect(restored.name).toBe('Green Valley Estate');
    expect(restored.description).toBeNull();
    expect(restored.isActive).toBe(true);
  });

  it('preserves the archived lifecycle through the persisted row shape', () => {
    const archivedRow: PropertyRow = {
      ...activeRow,
      archivedAt: 2000,
      updatedAt: 2000,
    };

    const property = Property.hydrate(archivedRow);
    expect(property.isArchived).toBe(true);

    const row = toPropertyRow(property);
    expect(row.archivedAt).toBe(2000);
    expect(row.updatedAt).toBe(2000);
    expect(Property.hydrate(toPropertyData(row)).isArchived).toBe(true);
  });

  it('keeps an optional description when present', () => {
    const row = toPropertyRow(
      Property.create({
        id: 'prop-2',
        name: 'Family House',
        address: '5 Oak Avenue',
        description: 'Corner unit',
        createdAt: 500,
      }),
    );

    expect(row.description).toBe('Corner unit');
  });
});