import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import {
  projectSpaceAvailability,
  summarizeAvailability,
} from './property-space-availability';
import type { SpaceOccupancySnapshot } from './space-occupancy-query';

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
    name: `Space ${id}`,
    type: options.type ?? 'ROOM',
    rentable: options.rentable ?? true,
    createdAt: 1,
  });
  return options.archivedAt === undefined ? base : base.archive(options.archivedAt);
}

function occupied(spaceId: string): SpaceOccupancySnapshot {
  return { spaceId, hasCurrentAgreement: true, hasUpcomingAgreement: false };
}

function upcoming(spaceId: string): SpaceOccupancySnapshot {
  return { spaceId, hasCurrentAgreement: false, hasUpcomingAgreement: true };
}

describe('projectSpaceAvailability', () => {
  it('labels a rentable, active space with no agreement as available', () => {
    const spaces = [space('room')];

    expect(projectSpaceAvailability(spaces, []).get('room')).toBe('AVAILABLE');
  });

  it('labels a space marked non-rentable as not rentable even when occupied', () => {
    const spaces = [space('room', { rentable: false })];

    const availability = projectSpaceAvailability(spaces, [occupied('room')]);

    expect(availability.get('room')).toBe('NOT_RENTABLE');
  });

  it('labels an archived space as archived', () => {
    const spaces = [space('room', { archivedAt: 2000 })];

    expect(projectSpaceAvailability(spaces, [occupied('room')]).get('room')).toBe('ARCHIVED');
  });

  it('suspends an active space whose parent is archived', () => {
    const spaces = [space('building', { archivedAt: 2000 }), space('room', { parentSpaceId: 'building' })];

    const availability = projectSpaceAvailability(spaces, []);

    expect(availability.get('building')).toBe('ARCHIVED');
    expect(availability.get('room')).toBe('SUSPENDED');
  });

  it('suspends a space when any ancestor is archived, at any depth', () => {
    const spaces = [
      space('building', { archivedAt: 2000 }),
      space('floor', { parentSpaceId: 'building' }),
      space('room', { parentSpaceId: 'floor' }),
    ];

    const availability = projectSpaceAvailability(spaces, []);

    expect(availability.get('floor')).toBe('SUSPENDED');
    expect(availability.get('room')).toBe('SUSPENDED');
  });

  it('keeps an independently archived descendant archived after the parent is restored', () => {
    const parent = space('building');
    const child = space('room', { parentSpaceId: 'building' });
    const parentArchived = parent.archive(2000);
    const childArchived = child.archive(3000);
    const parentRestored = parentArchived.restore(4000);

    const availability = projectSpaceAvailability(
      [parentRestored, childArchived],
      [],
    );

    expect(availability.get('building')).toBe('AVAILABLE');
    expect(availability.get('room')).toBe('ARCHIVED');
  });

  it('labels a space with a current agreement as occupied', () => {
    const spaces = [space('room')];

    expect(projectSpaceAvailability(spaces, [occupied('room')]).get('room')).toBe('OCCUPIED');
  });

  it('labels a space with only a future agreement as upcoming', () => {
    const spaces = [space('room')];

    expect(projectSpaceAvailability(spaces, [upcoming('room')]).get('room')).toBe('UPCOMING');
  });

  it('keeps an occupied space occupied when a future agreement also exists', () => {
    const spaces = [space('room')];

    const availability = projectSpaceAvailability(spaces, [
      { spaceId: 'room', hasCurrentAgreement: true, hasUpcomingAgreement: true },
    ]);

    expect(availability.get('room')).toBe('OCCUPIED');
  });

  it('ignores occupancy reported for spaces outside the property', () => {
    const spaces = [space('room')];

    const availability = projectSpaceAvailability(spaces, [occupied('other')]);

    expect(availability.get('room')).toBe('AVAILABLE');
    expect(availability.has('other')).toBe(false);
  });
});

describe('summarizeAvailability', () => {
  it('reports zeroes for a property without spaces', () => {
    expect(summarizeAvailability([], new Map())).toEqual({
      rentableSpaces: 0,
      occupiedSpaces: 0,
      upcomingSpaces: 0,
      availableSpaces: 0,
    });
  });

  it('counts only rentable, active spaces and partitions them by label', () => {
    const spaces = [
      space('building', { rentable: false }),
      space('occupied-room', { parentSpaceId: 'building' }),
      space('upcoming-room', { parentSpaceId: 'building' }),
      space('available-room', { parentSpaceId: 'building' }),
      space('non-rentable', { parentSpaceId: 'building', rentable: false }),
      space('archived', { parentSpaceId: 'building', archivedAt: 2000 }),
    ];
    const availability = projectSpaceAvailability(spaces, [
      occupied('occupied-room'),
      upcoming('upcoming-room'),
    ]);

    expect(summarizeAvailability(spaces, availability)).toEqual({
      rentableSpaces: 3,
      occupiedSpaces: 1,
      upcomingSpaces: 1,
      availableSpaces: 1,
    });
  });

  it('excludes spaces suspended by an archived ancestor from the partition', () => {
    const spaces = [space('building', { archivedAt: 2000 }), space('room', { parentSpaceId: 'building' })];
    const availability = projectSpaceAvailability(spaces, []);

    expect(summarizeAvailability(spaces, availability)).toEqual({
      rentableSpaces: 1,
      occupiedSpaces: 0,
      upcomingSpaces: 0,
      availableSpaces: 0,
    });
  });
});
