import { GetPropertySpace } from './get-property-space';
import { InMemoryPropertySpaceRepository, spaceAt } from './property-space-test-support';

describe('GetPropertySpace', () => {
  it('returns a space by id, active or archived', () => {
    const spaces = new InMemoryPropertySpaceRepository();
    spaces.save(spaceAt({ id: 'active' }));
    spaces.save(spaceAt({ id: 'archived' }).archive(2));
    const getSpace = new GetPropertySpace({ spaces });

    expect(getSpace.execute({ id: 'active' })?.isActive).toBe(true);
    expect(getSpace.execute({ id: 'archived' })?.isArchived).toBe(true);
  });

  it('returns null when the space does not exist', () => {
    const getSpace = new GetPropertySpace({ spaces: new InMemoryPropertySpaceRepository() });

    expect(getSpace.execute({ id: 'missing' })).toBeNull();
  });
});