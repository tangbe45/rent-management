import { useFocusEffect } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Property } from '../domain/property';
import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import {
  getProperty,
  listPropertySpaces,
  restorePropertySpace,
} from '../infrastructure/composition-root';
import { ArchivedSpaceListScreen } from './archived-space-list-screen';
import {
  cancelLatestAlert,
  confirmLatestAlert,
  installAlertSpy,
} from './alert-confirmation.test-support';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  getProperty: { execute: jest.fn() },
  listPropertySpaces: { execute: jest.fn() },
  restorePropertySpace: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildProperty(): Property {
  return Property.create({
    id: 'property-1',
    name: 'Green Valley Estate',
    address: '12 Main Street',
    createdAt: 1,
  });
}

function space(
  id: string,
  name: string,
  type: PropertySpaceType,
  archivedAt: number | null = null,
): PropertySpace {
  const base = PropertySpace.create({
    id,
    propertyId: 'property-1',
    parentSpaceId: null,
    name,
    type,
    rentable: false,
    createdAt: 1,
  });
  return archivedAt === null ? base : base.archive(archivedAt);
}

function findButton(root: ReactTestInstance, label: string): { onPress: () => void } | undefined {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  return buttons[buttons.length - 1]?.props as { onPress: () => void } | undefined;
}

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === fragment);
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<ArchivedSpaceListScreen propertyId="property-1" />);
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

describe('ArchivedSpaceListScreen', () => {
  let store: PropertySpace[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    jest.mocked(getProperty.execute).mockReturnValue(buildProperty());
    jest.mocked(listPropertySpaces.execute).mockImplementation(() => [...store]);
    installAlertSpy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists only archived spaces', async () => {
    store.push(space('active', 'Main Building', 'BUILDING'));
    store.push(space('old', 'Old Store', 'SHOP', 2000));

    const renderer = await renderScreen();

    expect(textShown(renderer.root, 'Old Store')).toBe(true);
    expect(textShown(renderer.root, 'Main Building')).toBe(false);
  });

  it('registers the refresh on the focus lifecycle, not just on mount', async () => {
    await renderScreen();

    expect(useFocusEffect).toHaveBeenCalledTimes(1);
  });

  it('shows a space archived elsewhere on return', async () => {
    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'No archived spaces.')).toBe(true);

    store.push(space('old', 'Old Store', 'SHOP', 2000));
    emitFocus();

    expect(textShown(renderer.root, 'Old Store')).toBe(true);
  });

  it('does nothing when the restore confirmation is cancelled', async () => {
    store.push(space('old', 'Old Store', 'SHOP', 2000));
    const renderer = await renderScreen();

    await act(async () => {
      findButton(renderer.root, 'Restore')?.onPress();
    });
    cancelLatestAlert();

    expect(restorePropertySpace.execute).not.toHaveBeenCalled();
    expect(textShown(renderer.root, 'Old Store')).toBe(true);
  });

  it('restores a space through the use case and removes it immediately', async () => {
    store.push(space('old', 'Old Store', 'SHOP', 2000));
    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Old Store')).toBe(true);

    store = [];
    await act(async () => {
      findButton(renderer.root, 'Restore')?.onPress();
    });
    expect(restorePropertySpace.execute).not.toHaveBeenCalled();
    confirmLatestAlert();

    expect(restorePropertySpace.execute).toHaveBeenCalledWith({ id: 'old' });
    expect(textShown(renderer.root, 'Old Store')).toBe(false);
  });
});
