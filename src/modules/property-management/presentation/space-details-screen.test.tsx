import { useFocusEffect } from 'expo-router';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { PropertySpaceCannotArchiveError } from '../application/property-space-errors';
import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import {
  archivePropertySpace,
  getPropertySpace,
  listPropertySpaces,
  restorePropertySpace,
} from '../infrastructure/composition-root';
import { SpaceDetailsScreen } from './space-details-screen';
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
  archivePropertySpace: { execute: jest.fn() },
  getPropertySpace: { execute: jest.fn() },
  listPropertySpaces: { execute: jest.fn() },
  restorePropertySpace: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildSpace(options: {
  id: string;
  name: string;
  type?: PropertySpaceType;
  parentSpaceId?: string | null;
  rentable?: boolean;
  createdAt?: number;
}): PropertySpace {
  return PropertySpace.create({
    id: options.id,
    propertyId: 'property-1',
    parentSpaceId: options.parentSpaceId ?? null,
    name: options.name,
    type: options.type ?? 'ROOM',
    rentable: options.rentable ?? false,
    createdAt: options.createdAt ?? 1,
  });
}

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === fragment);
}

function findButton(root: ReactTestInstance, label: string): ReactTestInstance | undefined {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  })[0];
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<SpaceDetailsScreen propertyId="property-1" spaceId="space-1" />);
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

describe('SpaceDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listPropertySpaces.execute).mockReturnValue([]);
    installAlertSpy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reloads name, type, rentable and parent when the screen regains focus after an edit', async () => {
    const original = buildSpace({ id: 'space-1', name: 'Room A', type: 'ROOM', rentable: false });
    jest.mocked(getPropertySpace.execute).mockReturnValue(original);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([original]);

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Room A')).toBe(true);
    expect(textShown(renderer.root, 'Room')).toBe(true);
    expect(textShown(renderer.root, 'Not rentable')).toBe(true);
    expect(textShown(renderer.root, 'Top level')).toBe(true);

    const building = buildSpace({ id: 'building', name: 'Main Building', type: 'BUILDING' });
    const updated = buildSpace({
      id: 'space-1',
      name: 'Suite A',
      type: 'APARTMENT',
      parentSpaceId: 'building',
      rentable: true,
      createdAt: 1,
    });
    jest.mocked(getPropertySpace.execute).mockReturnValue(updated);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building, updated]);
    emitFocus();

    expect(textShown(renderer.root, 'Suite A')).toBe(true);
    expect(textShown(renderer.root, 'Apartment')).toBe(true);
    expect(textShown(renderer.root, 'Rentable')).toBe(true);
    expect(textShown(renderer.root, 'Main Building')).toBe(true);
    expect(textShown(renderer.root, 'Room A')).toBe(false);
  });

  it('registers the reload on the focus lifecycle, not just on mount', async () => {
    jest.mocked(getPropertySpace.execute).mockReturnValue(buildSpace({ id: 'space-1', name: 'Room A' }));

    await renderScreen();

    expect(useFocusEffect).toHaveBeenCalledTimes(1);
  });

  it('shows a localized error when archiving the space is blocked by active rental agreements', async () => {
    const active = buildSpace({ id: 'space-1', name: 'Room A' });
    jest.mocked(getPropertySpace.execute).mockReturnValue(active);
    jest
      .mocked(archivePropertySpace.execute)
      .mockImplementationOnce(() => {
        throw new PropertySpaceCannotArchiveError('space-1');
      });

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'This space cannot be archived because it has active rental agreements.')).toBe(false);

    await act(async () => {
      findButton(renderer.root, 'Archive')?.props.onPress();
    });
    expect(archivePropertySpace.execute).not.toHaveBeenCalled();
    confirmLatestAlert();

    expect(archivePropertySpace.execute).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'This space cannot be archived because it has active rental agreements.')).toBe(true);
    expect(findButton(renderer.root, 'Archive')).toBeDefined();
  });

  it('does nothing when the space archive confirmation is cancelled', async () => {
    jest
      .mocked(getPropertySpace.execute)
      .mockReturnValue(buildSpace({ id: 'space-1', name: 'Room A' }));

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Archive')?.props.onPress();
    });

    const archiveButtons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as
      | { style?: string }[]
      | undefined;
    expect(archiveButtons?.some((button) => button.style === 'destructive')).toBe(true);

    cancelLatestAlert();

    expect(archivePropertySpace.execute).not.toHaveBeenCalled();
    expect(findButton(renderer.root, 'Archive')).toBeDefined();
    expect(findButton(renderer.root, 'Restore')).toBeUndefined();
  });

  it('does nothing when the space restore confirmation is cancelled', async () => {
    jest
      .mocked(getPropertySpace.execute)
      .mockReturnValue(buildSpace({ id: 'space-1', name: 'Room A' }).archive(2000));

    const renderer = await renderScreen();
    await act(async () => {
      findButton(renderer.root, 'Restore')?.props.onPress();
    });

    const restoreButtons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as
      | { style?: string }[]
      | undefined;
    expect(restoreButtons?.some((button) => button.style === 'destructive')).toBe(false);

    cancelLatestAlert();

    expect(restorePropertySpace.execute).not.toHaveBeenCalled();
    expect(findButton(renderer.root, 'Restore')).toBeDefined();
    expect(findButton(renderer.root, 'Archive')).toBeUndefined();
  });

  it('reflects an archived space without leaving the screen', async () => {
    const active = buildSpace({ id: 'space-1', name: 'Room A' });
    jest.mocked(getPropertySpace.execute).mockReturnValue(active);

    const renderer = await renderScreen();
    expect(findButton(renderer.root, 'Archive')).toBeDefined();
    expect(findButton(renderer.root, 'Restore')).toBeUndefined();

    jest.mocked(getPropertySpace.execute).mockReturnValue(active.archive(2000));
    await act(async () => {
      findButton(renderer.root, 'Archive')?.props.onPress();
    });
    expect(archivePropertySpace.execute).not.toHaveBeenCalled();
    confirmLatestAlert();

    expect(findButton(renderer.root, 'Restore')).toBeDefined();
    expect(findButton(renderer.root, 'Archive')).toBeUndefined();
    expect(archivePropertySpace.execute).toHaveBeenCalledTimes(1);
  });

  it('reflects a restored space without leaving the screen', async () => {
    jest
      .mocked(getPropertySpace.execute)
      .mockReturnValue(buildSpace({ id: 'space-1', name: 'Room A' }).archive(2000));

    const renderer = await renderScreen();
    expect(findButton(renderer.root, 'Restore')).toBeDefined();

    jest.mocked(getPropertySpace.execute).mockReturnValue(buildSpace({ id: 'space-1', name: 'Room A' }));
    await act(async () => {
      findButton(renderer.root, 'Restore')?.props.onPress();
    });
    expect(restorePropertySpace.execute).not.toHaveBeenCalled();
    confirmLatestAlert();

    expect(restorePropertySpace.execute).toHaveBeenCalledWith({ id: 'space-1' });
    expect(findButton(renderer.root, 'Archive')).toBeDefined();
    expect(findButton(renderer.root, 'Restore')).toBeUndefined();
    expect(restorePropertySpace.execute).toHaveBeenCalledTimes(1);
  });
});
