import {
  Property,
  PropertyAlreadyActiveError,
  PropertyAlreadyArchivedError,
} from './property';

function createProperty(overrides: Partial<{ name: string; address: string; description: string }> = {}) {
  return Property.create({
    id: 'prop-1',
    name: overrides.name ?? 'Green Valley Estate',
    address: overrides.address ?? '12 Main Street',
    description: overrides.description,
    createdAt: 1000,
  });
}

describe('Property creation', () => {
  it('creates an active property with normalized fields', () => {
    const property = createProperty({ name: '  Green Valley Estate  ', address: '  12 Main Street  ' });

    expect(property.id).toBe('prop-1');
    expect(property.name).toBe('Green Valley Estate');
    expect(property.address).toBe('12 Main Street');
    expect(property.description).toBeNull();
    expect(property.createdAt).toBe(1000);
    expect(property.updatedAt).toBe(1000);
    expect(property.archivedAt).toBeNull();
    expect(property.isActive).toBe(true);
    expect(property.isArchived).toBe(false);
  });

  it('trims a provided description', () => {
    const property = createProperty({ description: '  Near the market  ' });
    expect(property.description).toBe('Near the market');
  });

  it('normalizes a blank description to null', () => {
    expect(createProperty({ description: '   ' }).description).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(() => createProperty({ name: '' })).toThrow(/name is required/);
  });

  it('rejects a whitespace-only name', () => {
    expect(() => createProperty({ name: '   ' })).toThrow(/name is required/);
  });

  it('rejects an over-long name', () => {
    expect(() => createProperty({ name: 'X'.repeat(101) })).toThrow(/at most 100 characters/);
  });

  it('rejects an empty address', () => {
    expect(() => createProperty({ address: '' })).toThrow(/address is required/);
  });

  it('rejects a whitespace-only address', () => {
    expect(() => createProperty({ address: '   ' })).toThrow(/address is required/);
  });

  it('rejects an over-long address', () => {
    expect(() => createProperty({ address: 'Y'.repeat(201) })).toThrow(/at most 200 characters/);
  });
});

describe('Property lifecycle', () => {
  it('archives an active property, setting archivedAt and updatedAt', () => {
    const archived = createProperty().archive(2000);

    expect(archived.isArchived).toBe(true);
    expect(archived.archivedAt).toBe(2000);
    expect(archived.updatedAt).toBe(2000);
  });

  it('rejects archiving an already-archived property', () => {
    const archived = createProperty().archive(2000);
    expect(() => archived.archive(3000)).toThrow(PropertyAlreadyArchivedError);
  });

  it('restores an archived property and clears archivedAt', () => {
    const restored = createProperty().archive(2000).restore(3000);

    expect(restored.isActive).toBe(true);
    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe(3000);
  });

  it('rejects restoring an active property', () => {
    expect(() => createProperty().restore(2000)).toThrow(PropertyAlreadyActiveError);
  });
});

describe('Property identity and update', () => {
  it('preserves id and createdAt through archive and restore', () => {
    const original = createProperty();
    const restored = original.archive(2000).restore(3000);

    expect(restored.id).toBe(original.id);
    expect(restored.createdAt).toBe(original.createdAt);
  });

  it('updates editable fields while preserving identity and active state', () => {
    const updated = createProperty().update({
      name: 'Renamed',
      address: 'New address',
      description: 'A note',
      updatedAt: 5000,
    });

    expect(updated.id).toBe('prop-1');
    expect(updated.createdAt).toBe(1000);
    expect(updated.name).toBe('Renamed');
    expect(updated.address).toBe('New address');
    expect(updated.description).toBe('A note');
    expect(updated.updatedAt).toBe(5000);
    expect(updated.isActive).toBe(true);
  });

  it('does not restore an archived property when editing it', () => {
    const updated = createProperty().archive(2000).update({
      name: 'Renamed',
      address: 'New address',
      updatedAt: 5000,
    });

    expect(updated.isArchived).toBe(true);
    expect(updated.archivedAt).toBe(2000);
  });

  it('validates fields on update', () => {
    expect(() =>
      createProperty().update({ name: '   ', address: 'Still here', updatedAt: 5000 }),
    ).toThrow(/name is required/);
  });
});

describe('Property hydration', () => {
  it('hydrates a persisted property, preserving archive state and timestamps', () => {
    const property = Property.hydrate({
      id: 'prop-9',
      name: 'Family House',
      address: '5 Oak Avenue',
      description: null,
      createdAt: 10,
      updatedAt: 20,
      archivedAt: 30,
    });

    expect(property.id).toBe('prop-9');
    expect(property.name).toBe('Family House');
    expect(property.archivedAt).toBe(30);
    expect(property.isArchived).toBe(true);
  });
});