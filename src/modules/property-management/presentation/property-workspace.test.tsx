import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import {
  projectSpaceAvailability,
  summarizeAvailability,
} from '../application/property-space-availability';
import type { SpaceOccupancySnapshot } from '../application/space-occupancy-query';
import { Property } from '../domain/property';
import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import { PropertyWorkspace } from './property-workspace';

jest.setTimeout(30_000);

function buildProperty(archivedAt: number | null = null): Property {
  const base = Property.create({
    id: 'p1',
    name: 'Green Valley Estate',
    address: '12 Main Street',
    createdAt: 1,
  });
  return archivedAt === null ? base : base.archive(archivedAt);
}

function space(
  id: string,
  name: string,
  type: PropertySpaceType,
  options: { parentSpaceId?: string | null; rentable?: boolean; archivedAt?: number } = {},
): PropertySpace {
  const base = PropertySpace.create({
    id,
    propertyId: 'p1',
    parentSpaceId: options.parentSpaceId ?? null,
    name,
    type,
    rentable: options.rentable ?? false,
    createdAt: 1,
  });
  return options.archivedAt === undefined ? base : base.archive(options.archivedAt);
}

function findButton(root: ReactTestInstance, label: string): { onPress: () => void } | undefined {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  return buttons[buttons.length - 1]?.props as { onPress: () => void } | undefined;
}

function textShown(root: ReactTestInstance, message: string | number): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

async function renderWorkspace(
  property: Property,
  spaces: readonly PropertySpace[],
  expanded: readonly string[] = [],
  occupancy: readonly SpaceOccupancySnapshot[] = [],
) {
  const spies = {
    onToggleSpace: jest.fn(),
    onOpenSpace: jest.fn(),
    onAddChildSpace: jest.fn(),
    onEditSpace: jest.fn(),
    onArchiveSpace: jest.fn(),
    onAddSpace: jest.fn(),
    onOpenArchivedSpaces: jest.fn(),
    onOpenDetails: jest.fn(),
    onEditProperty: jest.fn(),
    onArchiveProperty: jest.fn(),
    onRestoreProperty: jest.fn(),
  };
  const expandedSet = new Set(expanded);
  const availability = projectSpaceAvailability(spaces, occupancy);
  const summary = summarizeAvailability(spaces, availability);
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <PropertyWorkspace
        property={property}
        spaces={spaces}
        availability={availability}
        summary={summary}
        expandedSpaceIds={expandedSet}
        {...spies}
      />,
    );
  });
  return { root: renderer.root, ...spies };
}

const activeSpaces = [
  space('building', 'Main Building', 'BUILDING'),
  space('room-1', 'Room 1', 'ROOM', { parentSpaceId: 'building', rentable: true }),
  space('room-2', 'Room 2', 'ROOM', { parentSpaceId: 'building' }),
];

describe('PropertyWorkspace', () => {
  it('shows the property header, availability summary and spaces heading', async () => {
    const { root } = await renderWorkspace(buildProperty(), activeSpaces);

    expect(textShown(root, 'Green Valley Estate')).toBe(true);
    expect(textShown(root, '12 Main Street')).toBe(true);
    expect(textShown(root, '🌳 Spaces')).toBe(true);
    expect(textShown(root, 'Rentable')).toBe(true);
    expect(textShown(root, 'Occupied')).toBe(true);
    expect(textShown(root, 'Upcoming')).toBe(true);
    expect(textShown(root, 'Available')).toBe(true);
    // Building is not rentable, so only Room 1 counts as rentable/available.
    expect(textShown(root, 3)).toBe(false);
    expect(textShown(root, 2)).toBe(false);
  });

  it('derives occupied and upcoming indicators from agreement occupancy', async () => {
    const { root } = await renderWorkspace(buildProperty(), activeSpaces, ['building'], [
      { spaceId: 'room-1', hasCurrentAgreement: true, hasUpcomingAgreement: false },
      { spaceId: 'room-2', hasCurrentAgreement: false, hasUpcomingAgreement: true },
    ]);

    expect(textShown(root, 'Occupied')).toBe(true);
    expect(textShown(root, 'Upcoming')).toBe(true);
  });

  it('guides the user to add a first space when there are none', async () => {
    const { root, onAddSpace } = await renderWorkspace(buildProperty(), []);

    expect(textShown(root, 'No spaces yet')).toBe(true);
    expect(findButton(root, 'Add your first space')).toBeDefined();

    await act(async () => {
      findButton(root, 'Add your first space')?.onPress();
    });
    expect(onAddSpace).toHaveBeenCalledTimes(1);
  });

  it('excludes archived spaces from the active tree', async () => {
    const { root } = await renderWorkspace(buildProperty(), [
      ...activeSpaces,
      space('old', 'Old Store', 'SHOP', { archivedAt: 2000 }),
    ]);

    expect(textShown(root, 'Main Building')).toBe(true);
    expect(textShown(root, 'Old Store')).toBe(false);
  });

  it('expands and collapses through the tree control', async () => {
    const { root, onToggleSpace } = await renderWorkspace(buildProperty(), activeSpaces);

    expect(textShown(root, 'Room 1')).toBe(false);

    await act(async () => {
      findButton(root, 'Expand Main Building')?.onPress();
    });
    expect(onToggleSpace).toHaveBeenCalledWith('building');
  });

  it('exposes property information, edit and archive through the header menu', async () => {
    const { root, onOpenDetails, onEditProperty, onArchiveProperty } = await renderWorkspace(
      buildProperty(),
      activeSpaces,
    );

    await act(async () => {
      findButton(root, 'Property actions')?.onPress();
    });

    expect(findButton(root, 'Property information')).toBeDefined();
    expect(findButton(root, 'Edit property')).toBeDefined();
    expect(findButton(root, 'Archive')).toBeDefined();

    await act(async () => {
      findButton(root, 'Property information')?.onPress();
    });
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onEditProperty).not.toHaveBeenCalled();
    expect(onArchiveProperty).not.toHaveBeenCalled();
  });

  it('offers restore instead of archive for an archived property', async () => {
    const { root, onRestoreProperty } = await renderWorkspace(
      buildProperty(2000),
      activeSpaces,
    );

    await act(async () => {
      findButton(root, 'Property actions')?.onPress();
    });

    expect(findButton(root, 'Restore')).toBeDefined();
    expect(findButton(root, 'Archive')).toBeUndefined();

    await act(async () => {
      findButton(root, 'Restore')?.onPress();
    });
    expect(onRestoreProperty).toHaveBeenCalledTimes(1);
  });

  it('links to archived spaces and to adding a space', async () => {
    const { root, onOpenArchivedSpaces, onAddSpace } = await renderWorkspace(
      buildProperty(),
      activeSpaces,
    );

    await act(async () => {
      findButton(root, 'Archived spaces')?.onPress();
    });
    await act(async () => {
      findButton(root, 'Add space')?.onPress();
    });

    expect(onOpenArchivedSpaces).toHaveBeenCalledTimes(1);
    expect(onAddSpace).toHaveBeenCalledTimes(1);
  });
});
