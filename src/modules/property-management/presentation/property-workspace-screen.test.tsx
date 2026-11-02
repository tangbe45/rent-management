import { router, useFocusEffect } from 'expo-router';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import {
  projectSpaceAvailability,
  summarizeAvailability,
} from '../application/property-space-availability';
import { Property } from '../domain/property';
import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import {
  archiveProperty,
  archivePropertySpace,
  getProperty,
  getPropertyWorkspaceOverview,
  restoreProperty,
} from '../infrastructure/composition-root';
import { PropertyWorkspaceScreen } from './property-workspace-screen';
import {
  cancelLatestAlert,
  confirmLatestAlert,
  installAlertSpy,
  latestAlertMessage,
} from './alert-confirmation.test-support';
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
  getPropertyWorkspaceOverview: { execute: jest.fn() },
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

/**
 * Presses the destructive button of the native confirmation dialog raised by
 * the last lifecycle action. Confirmation is a real user step, so tests must go
 * through it instead of calling the use case directly.
 */
const confirmAlert = confirmLatestAlert;
const cancelAlert = cancelLatestAlert;

describe('PropertyWorkspaceScreen', () => {
  let store: PropertySpace[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    jest
      .mocked(getProperty.execute)
      .mockReturnValue(buildProperty('property-1', 'Green Valley Estate'));
    jest.mocked(getPropertyWorkspaceOverview.execute).mockImplementation(() => {
      const spaces = [...store];
      const availability = projectSpaceAvailability(spaces, []);
      return { spaces, availability, summary: summarizeAvailability(spaces, availability) };
    });
    jest.mocked(archivePropertySpace.execute).mockImplementation(({ id }) => {
      const target = store.find((space) => space.id === id);
      if (target === undefined) {
        throw new Error(`Unknown space: ${id}`);
      }
      const archived = target.archive(3000);
      store = store.map((space) => (space.id === id ? archived : space));
      return archived;
    });
    installAlertSpy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('asks for confirmation before archiving the property and returns to the list', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Property actions')?.onPress();
    });
    await act(async () => {
      findButton(renderer.root, 'Archive')?.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(archiveProperty.execute).not.toHaveBeenCalled();

    confirmAlert();

    expect(archiveProperty.execute).toHaveBeenCalledWith({ id: 'property-1' });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the property archive confirmation is cancelled', async () => {
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Property actions')?.onPress();
    });
    await act(async () => {
      findButton(renderer.root, 'Archive')?.onPress();
    });
    cancelAlert();

    expect(archiveProperty.execute).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('archives a space after confirmation and updates the active tree immediately', async () => {
    store.push(space('building', 'Main Building', 'BUILDING'));
    store.push(space('room-1', 'Room 1', 'ROOM', { parentSpaceId: 'building' }));

    const renderer = await renderScreen();
    requestExpandOnNextWorkspaceFocus('property-1', 'building');
    emitFocus();

    expect(textShown(renderer.root, 'Room 1')).toBe(true);

    await act(async () => {
      findButton(renderer.root, 'Space actions Room 1')?.onPress();
    });

    await act(async () => {
      findButton(renderer.root, 'Archive')?.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(archivePropertySpace.execute).not.toHaveBeenCalled();

    confirmAlert();

    expect(archivePropertySpace.execute).toHaveBeenCalledWith({ id: 'room-1' });
    expect(textShown(renderer.root, 'Room 1')).toBe(false);
  });

  it('warns that descendants are suspended when archiving a parent space', async () => {
    store.push(space('building', 'Main Building', 'BUILDING'));
    store.push(space('room-1', 'Room 1', 'ROOM', { parentSpaceId: 'building' }));

    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Space actions Main Building')?.onPress();
    });
    await act(async () => {
      findButton(renderer.root, 'Archive')?.onPress();
    });

    expect(latestAlertMessage()).toContain('suspend active descendants');
  });

  it('restores an archived property in place after confirmation', async () => {
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

    expect(restoreProperty.execute).not.toHaveBeenCalled();
    confirmAlert();

    expect(restoreProperty.execute).toHaveBeenCalledWith({ id: 'property-1' });
  });
});
