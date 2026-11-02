import { ListArchivedProperties } from './list-archived-properties';
import { ListProperties } from './list-properties';
import { InMemoryPropertyRepository, activeProperty, archivedProperty } from './test-support';

function seed() {
  const properties = new InMemoryPropertyRepository();
  properties.save(activeProperty('active-1'));
  properties.save(activeProperty('active-2'));
  properties.save(archivedProperty('archived-1'));
  return properties;
}

describe('ListProperties', () => {
  it('returns active properties only', () => {
    const listProperties = new ListProperties({ properties: seed() });
    const ids = listProperties.execute().map((property) => property.id);

    expect(ids.sort()).toEqual(['active-1', 'active-2']);
  });

  it('returns an empty list when everything is archived', () => {
    const properties = new InMemoryPropertyRepository();
    properties.save(archivedProperty('archived-1'));
    expect(new ListProperties({ properties }).execute()).toEqual([]);
  });
});

describe('ListArchivedProperties', () => {
  it('returns archived properties only', () => {
    const listArchived = new ListArchivedProperties({ properties: seed() });
    const ids = listArchived.execute().map((property) => property.id);

    expect(ids).toEqual(['archived-1']);
  });

  it('returns an empty list when nothing is archived', () => {
    const properties = new InMemoryPropertyRepository();
    properties.save(activeProperty('active-1'));
    expect(new ListArchivedProperties({ properties }).execute()).toEqual([]);
  });
});