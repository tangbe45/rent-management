import { ArchiveProperty } from './archive-property';
import { ArchiveBlockedByActiveRentalAgreementsError, PropertyNotFoundError } from './errors';
import { PropertyAlreadyArchivedError } from '../domain/property';
import {
  FakeClock,
  InMemoryPropertyRepository,
  StubActiveRentalAgreementsQuery,
  activeProperty,
  archivedProperty,
} from './test-support';

function build(seedProperty = activeProperty('prop-1'), blocked: string[] = []) {
  const properties = new InMemoryPropertyRepository();
  properties.save(seedProperty);
  const clock = new FakeClock(9000);
  const activeRentalAgreements = new StubActiveRentalAgreementsQuery(new Set(blocked));
  return { properties, archiveProperty: new ArchiveProperty({ properties, activeRentalAgreements, clock }) };
}

describe('ArchiveProperty', () => {
  it('archives an active property when there are no active rental agreements', () => {
    const { properties, archiveProperty } = build();

    const archived = archiveProperty.execute({ id: 'prop-1' });

    expect(archived.isArchived).toBe(true);
    expect(archived.archivedAt).toBe(9000);
    expect(properties.findById('prop-1')?.isArchived).toBe(true);
  });

  it('throws when the property does not exist', () => {
    const { archiveProperty } = build();
    expect(() => archiveProperty.execute({ id: 'missing' })).toThrow(PropertyNotFoundError);
  });

  it('rejects archiving an already-archived property', () => {
    const { archiveProperty } = build(archivedProperty('prop-2'));
    expect(() => archiveProperty.execute({ id: 'prop-2' })).toThrow(PropertyAlreadyArchivedError);
  });

  it('blocks archiving when active rental agreements exist', () => {
    const { archiveProperty } = build(activeProperty('prop-1'), ['prop-1']);
    expect(() => archiveProperty.execute({ id: 'prop-1' })).toThrow(
      ArchiveBlockedByActiveRentalAgreementsError,
    );
  });

  it('leaves the property active and unpersisted when archiving is blocked', () => {
    const { properties, archiveProperty } = build(activeProperty('prop-1'), ['prop-1']);

    expect(() => archiveProperty.execute({ id: 'prop-1' })).toThrow();

    expect(properties.findById('prop-1')?.isActive).toBe(true);
  });
});