import { useFocusEffect } from 'expo-router';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { ArchiveBlockedByActiveRentalAgreementsError } from '../application/errors';
import { Property } from '../domain/property';
import { archiveProperty, getProperty, restoreProperty } from '../infrastructure/composition-root';
import { confirmLatestAlert, installAlertSpy } from './alert-confirmation.test-support';
import { PropertyDetailsScreen } from './property-details-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  archiveProperty: { execute: jest.fn() },
  getProperty: { execute: jest.fn() },
  restoreProperty: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildProperty(id: string, name: string): Property {
  return Property.create({ id, name, address: '12 Main Street', createdAt: 1 });
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
    renderer = create(<PropertyDetailsScreen propertyId="property-1" />);
  });
  return renderer;
}

/**
 * Execute the callback the screen registered with `useFocusEffect`, emulating
 * the navigation focus event that fires when the user returns to the screen.
 */
function emitFocus(): void {
  const calls = jest.mocked(useFocusEffect).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const callback = calls[calls.length - 1]![0];
  act(() => {
    callback();
  });
}

describe('PropertyDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installAlertSpy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reloads the property when the screen regains focus after an edit', async () => {
    jest
      .mocked(getProperty.execute)
      .mockReturnValue(buildProperty('property-1', 'Green Valley Estate'));

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Green Valley Estate')).toBe(true);

    jest.mocked(getProperty.execute).mockReturnValue(buildProperty('property-1', 'Sunset Court'));
    emitFocus();

    expect(textShown(renderer.root, 'Sunset Court')).toBe(true);
    expect(textShown(renderer.root, 'Green Valley Estate')).toBe(false);
  });

  it('registers the reload on the focus lifecycle, not just on mount', async () => {
    jest.mocked(getProperty.execute).mockReturnValue(buildProperty('property-1', 'Green Valley'));

    await renderScreen();

    expect(useFocusEffect).toHaveBeenCalledTimes(1);
  });

  it('reflects an archived property without leaving the screen', async () => {
    const active = buildProperty('property-1', 'Green Valley Estate');
    jest.mocked(getProperty.execute).mockReturnValue(active);

    const renderer = await renderScreen();
    expect(findButton(renderer.root, 'Archive')).toBeDefined();
    expect(findButton(renderer.root, 'Restore')).toBeUndefined();

    jest.mocked(getProperty.execute).mockReturnValue(active.archive(2000));

    await act(async () => {
      findButton(renderer.root, 'Archive')?.props.onPress();
    });
    expect(archiveProperty.execute).not.toHaveBeenCalled();
    const archiveButtons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as
      | { style?: string }[]
      | undefined;
    expect(archiveButtons?.some((button) => button.style === 'destructive')).toBe(true);
    confirmLatestAlert();

    expect(findButton(renderer.root, 'Restore')).toBeDefined();
    expect(findButton(renderer.root, 'Archive')).toBeUndefined();
    expect(archiveProperty.execute).toHaveBeenCalledTimes(1);
  });

  it('shows a localized error when archiving the property is blocked by active rental agreements', async () => {
    jest.mocked(getProperty.execute).mockReturnValue(buildProperty('property-1', 'Green Valley Estate'));
    jest
      .mocked(archiveProperty.execute)
      .mockImplementationOnce(() => {
        throw new ArchiveBlockedByActiveRentalAgreementsError('property-1');
      });

    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'This property cannot be archived because it has active rental agreements.')).toBe(false);

    await act(async () => {
      findButton(renderer.root, 'Archive')?.props.onPress();
    });
    expect(archiveProperty.execute).not.toHaveBeenCalled();
    confirmLatestAlert();

    expect(archiveProperty.execute).toHaveBeenCalledTimes(1);
    expect(textShown(renderer.root, 'This property cannot be archived because it has active rental agreements.')).toBe(true);
    expect(findButton(renderer.root, 'Archive')).toBeDefined();
  });

  it('reflects a restored property without leaving the screen', async () => {
    jest
      .mocked(getProperty.execute)
      .mockReturnValue(buildProperty('property-1', 'Green Valley Estate').archive(2000));

    const renderer = await renderScreen();
    expect(findButton(renderer.root, 'Restore')).toBeDefined();
    expect(findButton(renderer.root, 'Archive')).toBeUndefined();

    jest
      .mocked(getProperty.execute)
      .mockReturnValue(buildProperty('property-1', 'Green Valley Estate'));

    await act(async () => {
      findButton(renderer.root, 'Restore')?.props.onPress();
    });
    expect(restoreProperty.execute).not.toHaveBeenCalled();
    const restoreButtons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] as
      | { style?: string }[]
      | undefined;
    expect(restoreButtons?.some((button) => button.style === 'destructive')).toBe(false);
    confirmLatestAlert();

    expect(findButton(renderer.root, 'Archive')).toBeDefined();
    expect(findButton(renderer.root, 'Restore')).toBeUndefined();
    expect(restoreProperty.execute).toHaveBeenCalledTimes(1);
  });
});
