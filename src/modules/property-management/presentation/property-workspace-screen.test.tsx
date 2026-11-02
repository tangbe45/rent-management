import { router, useFocusEffect } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Property } from '../domain/property';
import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import {
  archiveProperty,
  archivePropertySpace,
  getProperty,
  listPropertySpaces,
  restoreProperty,
} from '../infrastructure/composition-root';
import { PropertyWorkspaceScreen } from './property-workspace-screen';
import { consumePendingExpansions, requestExpandOnNextWorkspaceFocus } from './workspace-expansion';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  archiveProperty: { execute: jest.fn() },
  archivePropertySpace: { execute: jest.fn() },
  getProperty: { execute: jest.fn() },
  listPropertySpaces: { execute: jest.fn() },
  restoreProperty: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildProperty(id: string, name: string, archivedAt: number | null = null): Property {
  const base = Property.create({ id, name, address: '12 Main Street', createdAt: 1 });
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
    propertyId: 'property-1',
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

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === fragment);
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<PropertyWorkspaceScreen propertyId="property-1" />);
  });
  return renderer;
}

function emitFocus(): void {
  const calls = jest.mocked(useFocusEffect).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const callback = calls[calls.length - 1]![0];
  act(() => {
    callback();
  });
}

describe('PropertyWorkspaceScreen', () => {
  let store: PropertySpace[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    jest
      .mocked(getProperty.execute)
      .mockReturnValue(buildProperty('property-1', 'Green Valley Estate'));
    jest.mocked(listPropertySpaces.execute).mockImplementation(() => [...store]);
  });

  afterEach(() => {
    consumePendingExpansions('property-1');
  });

  it('shows a space created on another screen and expands its parent from the hint', async () => {
    store.push(space('building', 'Main Building', 'BUILDING'));
    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Room 1')).toBe(false);

    store.push(space('room-1', 'Room 1', 'ROOM', { parentSpaceId: 'building' }));
    requestExpandOnNextWorkspaceFocus('property-1', 'building');
    emitFocus();

    expect(textShown(renderer.root, 'Room 1')).toBe(true);
    expect(findButton(renderer.root, 'Collapse Main Building')).toBeDefined();
  });

  it('registers the refresh on the focus lifecycle, not just on mount', async () => {
    await renderScreen();

    expect(useFocusEffect).toHaveBeenCalledTimes(1);
  });

  it('keeps archived spaces out of the workspace tree', async () => {
    store.push(space('building', 'Main Building', 'BUILDING'));
    store.push(space('old', 'Old Store', 'SHOP', { archivedAt: 2000 }));

    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Main Building')).toBe(true);
    expect(textShown(renderer.root, 'Old Store')).toBe(false);
  });

  it('does not show a space when creation did not persist', async () => {
    const renderer = await renderScreen();

    emitFocus();

    expect(textShown(renderer.root, 'No spaces yet')).toBe(true);
    expect(textShown(renderer.root, 'Main Building')).toBe(false);
  });

  it('archives the property through the use case and returns to the list', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Property actions')?.onPress();
    });
    await act(async () => {
      findButton(renderer.root, 'Archive')?.onPress();
    });

    expect(archiveProperty.execute).toHaveBeenCalledWith({ id: 'property-1' });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('archives a space and updates the active tree immediately', async () => {
    store.push(space('building', 'Main Building', 'BUILDING'));
    store.push(space('room-1', 'Room 1', 'ROOM', { parentSpaceId: 'building' }));

    const renderer = await renderScreen();
    requestExpandOnNextWorkspaceFocus('property-1', 'building');
    emitFocus();

    expect(textShown(renderer.root, 'Room 1')).toBe(true);

    await act(async () => {
      findButton(renderer.root, 'Space actions Room 1')?.onPress();
    });

    store = [store[0]!, space('room-1', 'Room 1', 'ROOM', { parentSpaceId: 'building', archivedAt: 3000 })];

    await act(async () => {
      findButton(renderer.root, 'Archive')?.onPress();
    });

    expect(archivePropertySpace.execute).toHaveBeenCalledWith({ id: 'room-1' });
    expect(textShown(renderer.root, 'Room 1')).toBe(false);
  });

  it('restores an archived property in place', async () => {
    jest
      .mocked(getProperty.execute)
      .mockReturnValue(buildProperty('property-1', 'Green Valley Estate', 2000));
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Property actions')?.onPress();
    });
    await act(async () => {
      findButton(renderer.root, 'Restore')?.onPress();
    });

    expect(restoreProperty.execute).toHaveBeenCalledWith({ id: 'property-1' });
  });
});
