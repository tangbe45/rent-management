import { ListPropertySpaces } from './list-property-spaces';
import { InMemoryPropertySpaceRepository, spaceAt } from './property-space-test-support';

describe('ListPropertySpaces', () => {
  it('returns every space of a property, active and archived, and nothing from others', () => {
    const spaces = new InMemoryPropertySpaceRepository();
    spaces.save(spaceAt({ id: 'a' }));
    spaces.save(spaceAt({ id: 'b' }).archive(2));
    spaces.save(spaceAt({ id: 'other', propertyId: 'property-2' }));
    const listSpaces = new ListPropertySpaces({ spaces });

    const result = listSpaces.execute({ propertyId: 'property-1' });

    expect(result.map((space) => space.id).sort()).toEqual(['a', 'b']);
  });
});