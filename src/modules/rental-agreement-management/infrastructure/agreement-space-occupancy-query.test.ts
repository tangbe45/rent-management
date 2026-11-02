import {
  agreementAt,
  InMemoryRentalAgreementRepository,
} from '../../rental-agreement-management/application/test-support';
import type { RentalAgreementFilter } from '../../rental-agreement-management/domain/rental-agreement-repository';
import { AgreementSpaceOccupancyQuery } from './agreement-space-occupancy-query';

const TODAY = '2026-10-08';

class CountingRentalAgreementRepository extends InMemoryRentalAgreementRepository {
  readonly filters: (RentalAgreementFilter | undefined)[] = [];

  override findAll(filter?: RentalAgreementFilter) {
    this.filters.push(filter);
    return super.findAll(filter);
  }
}

function buildRepository(): CountingRentalAgreementRepository {
  const repository = new CountingRentalAgreementRepository();
  repository.save(
    agreementAt({ id: 'active', spaceId: 'space-1', startDate: '2026-01-01' }),
  );
  repository.save(
    agreementAt({ id: 'upcoming', spaceId: 'space-2', startDate: '2026-12-01' }),
  );
  repository.save(
    agreementAt({
      id: 'ended',
      spaceId: 'space-3',
      startDate: '2026-01-01',
      endDate: '2026-09-30',
    }),
  );
  repository.save(
    agreementAt({
      id: 'terminated',
      spaceId: 'space-4',
      startDate: '2026-01-01',
      terminationDate: '2026-08-01',
    }),
  );
  return repository;
}

describe('AgreementSpaceOccupancyQuery', () => {
  it('reports current and upcoming agreements, ignoring ended and terminated ones', () => {
    const query = new AgreementSpaceOccupancyQuery({ agreements: buildRepository() });

    const snapshots = query.findForSpaces(
      ['space-1', 'space-2', 'space-3', 'space-4'],
      TODAY,
    );

    expect(snapshots).toEqual([
      { spaceId: 'space-1', hasCurrentAgreement: true, hasUpcomingAgreement: false },
      { spaceId: 'space-2', hasCurrentAgreement: false, hasUpcomingAgreement: true },
    ]);
  });

  it('lets a current agreement take precedence over a future agreement on the same space', () => {
    const repository = new CountingRentalAgreementRepository();
    repository.save(
      agreementAt({ id: 'active', spaceId: 'space-1', startDate: '2026-01-01' }),
    );
    repository.save(
      agreementAt({ id: 'upcoming', spaceId: 'space-1', startDate: '2027-01-01' }),
    );
    const query = new AgreementSpaceOccupancyQuery({ agreements: repository });

    expect(query.findForSpaces(['space-1'], TODAY)).toEqual([
      { spaceId: 'space-1', hasCurrentAgreement: true, hasUpcomingAgreement: false },
    ]);
  });

  it('asks the repository once for every requested space, never once per space', () => {
    const repository = buildRepository();
    const query = new AgreementSpaceOccupancyQuery({ agreements: repository });

    query.findForSpaces(['space-1', 'space-2'], TODAY);

    expect(repository.filters).toEqual([{ spaceIds: ['space-1', 'space-2'] }]);
  });

  it('returns no snapshot for an unrequested space', () => {
    const query = new AgreementSpaceOccupancyQuery({ agreements: buildRepository() });

    expect(query.findForSpaces(['space-2'], TODAY)).toEqual([
      { spaceId: 'space-2', hasCurrentAgreement: false, hasUpcomingAgreement: true },
    ]);
  });

  it('skips the query entirely when no space is requested', () => {
    const repository = buildRepository();
    const query = new AgreementSpaceOccupancyQuery({ agreements: repository });

    expect(query.findForSpaces([], TODAY)).toEqual([]);
    expect(repository.filters).toHaveLength(0);
  });
});
