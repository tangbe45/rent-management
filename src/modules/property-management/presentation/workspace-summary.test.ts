import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import { summarizeActiveSpaces } from './workspace-summary';

function space(
  id: string,
  options: {
    parentSpaceId?: string | null;
    rentable?: boolean;
    archivedAt?: number;
    type?: PropertySpaceType;
  } = {},
): PropertySpace {
  const base = PropertySpace.create({
    id,
    propertyId: 'property-1',
    parentSpaceId: options.parentSpaceId ?? null,
    name: id,
    type: options.type ?? 'ROOM',
    rentable: options.rentable ?? false,
    createdAt: 1,
  });
  return options.archivedAt === undefined ? base : base.archive(options.archivedAt);
}

describe('summarizeActiveSpaces', () => {
  it('returns zeroes for no spaces', () => {
    expect(summarizeActiveSpaces([])).toEqual({
      activeSpaces: 0,
      rentableSpaces: 0,
      topLevelSpaces: 0,
    });
  });

  it('excludes archived spaces from every count', () => {
    const summary = summarizeActiveSpaces([
      space('active', { rentable: true }),
      space('old', { rentable: true, archivedAt: 2000 }),
    ]);

    expect(summary).toEqual({ activeSpaces: 1, rentableSpaces: 1, topLevelSpaces: 1 });
  });

  it('counts rentable active spaces independently of type', () => {
    const summary = summarizeActiveSpaces([
      space('building', { type: 'BUILDING', rentable: true }),
      space('room-a', { type: 'ROOM', rentable: false }),
      space('room-b', { type: 'ROOM', rentable: true }),
    ]);

    expect(summary.rentableSpaces).toBe(2);
    expect(summary.activeSpaces).toBe(3);
  });

  it('treats an active space whose parent is archived as top level, matching the active tree', () => {
    const summary = summarizeActiveSpaces([
      space('building', { archivedAt: 2000 }),
      space('room', { parentSpaceId: 'building' }),
    ]);

    expect(summary.activeSpaces).toBe(1);
    expect(summary.topLevelSpaces).toBe(1);
  });

  it('does not count children as top level', () => {
    const summary = summarizeActiveSpaces([
      space('building'),
      space('floor', { parentSpaceId: 'building', type: 'FLOOR' }),
      space('room', { parentSpaceId: 'floor' }),
    ]);

    expect(summary.topLevelSpaces).toBe(1);
  });
});
