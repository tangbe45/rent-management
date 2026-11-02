import { GetProperty } from './get-property';
import { InMemoryPropertyRepository, activeProperty, archivedProperty } from './test-support';

describe('GetProperty', () => {
  it('retrieves an active property by id', () => {
    const properties = new InMemoryPropertyRepository();
    properties.save(activeProperty('prop-1'));
    const getProperty = new GetProperty({ properties });

    expect(getProperty.execute({ id: 'prop-1' })?.id).toBe('prop-1');
  });

  it('also retrieves an archived property by id', () => {
    const properties = new InMemoryPropertyRepository();
    properties.save(archivedProperty('prop-2'));
    const getProperty = new GetProperty({ properties });

    expect(getProperty.execute({ id: 'prop-2' })?.isArchived).toBe(true);
  });

  it('returns null for an unknown id', () => {
    const getProperty = new GetProperty({ properties: new InMemoryPropertyRepository() });
    expect(getProperty.execute({ id: 'missing' })).toBeNull();
  });
});