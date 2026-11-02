import { PropertySpaceArchivedError } from '../domain/property-space';
import { ArchivePropertySpace } from './archive-property-space';
import { PropertySpaceCannotArchiveError, PropertySpaceNotFoundError } from './property-space-errors';
import {
  InMemoryPropertySpaceRepository,
  spaceAt,
  StubSpaceActiveRentalAgreementsQuery,
} from './property-space-test-support';
import { FakeClock } from './test-support';

function build(blocked: ReadonlySet<string> = new Set()) {
  const spaces = new InMemoryPropertySpaceRepository();
  const clock = new FakeClock(9000);
  const archiveSpace = new ArchivePropertySpace({
    spaces,
    activeRentalAgreements: new StubSpaceActiveRentalAgreementsQuery(blocked),
    clock,
  });
  return { spaces, archiveSpace };
}

describe('ArchivePropertySpace', () => {
  it('archives an active space without touching its children', () => {
    const { spaces, archiveSpace } = build();
    spaces.save(spaceAt({ id: 'parent' }));
    spaces.save(spaceAt({ id: 'child', parentSpaceId: 'parent' }));

    const archived = archiveSpace.execute({ id: 'parent' });

    expect(archived.isArchived).toBe(true);
    expect(archived.archivedAt).toBe(9000);
    expect(archived.updatedAt).toBe(9000);
    expect(spaces.findById('child')?.isActive).toBe(true);
  });

  it('rejects unknown or already-archived spaces', () => {
    const { spaces, archiveSpace } = build();
    spaces.save(spaceAt({ id: 'a' }).archive(2));

    expect(() => archiveSpace.execute({ id: 'missing' })).toThrow(PropertySpaceNotFoundError);
    expect(() => archiveSpace.execute({ id: 'a' })).toThrow(PropertySpaceArchivedError);
  });

  it('rejects archiving while active rental agreements exist', () => {
    const { spaces, archiveSpace } = build(new Set(['a']));
    spaces.save(spaceAt({ id: 'a' }));

    expect(() => archiveSpace.execute({ id: 'a' })).toThrow(PropertySpaceCannotArchiveError);
    expect(spaces.findById('a')?.isActive).toBe(true);
  });
});