import { useFocusEffect } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Property } from '../domain/property';
import { listArchivedProperties, restoreProperty } from '../infrastructure/composition-root';
import { ArchivedPropertyListScreen } from './archived-property-list-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listArchivedProperties: { execute: jest.fn() },
  restoreProperty: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildArchivedProperty(id: string, name: string): Property {
  return Property.create({ id, name, address: '12 Main Street', createdAt: 1 }).archive(2000);
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
    renderer = create(<ArchivedPropertyListScreen />);
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

describe('ArchivedPropertyListScreen', () => {
  let store: Property[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    jest.mocked(listArchivedProperties.execute).mockImplementation(() => [...store]);
  });

  it('shows a property archived elsewhere when the screen regains focus', async () => {
    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Green Valley Estate')).toBe(false);

    store.push(buildArchivedProperty('property-1', 'Green Valley Estate'));
    emitFocus();

    expect(textShown(renderer.root, 'Green Valley Estate')).toBe(true);
  });

  it('registers the reload on the focus lifecycle, not just on mount', async () => {
    await renderScreen();

    expect(useFocusEffect).toHaveBeenCalledTimes(1);
  });

  it('removes a property from the archived list immediately after a restore', async () => {
    store.push(buildArchivedProperty('property-1', 'Green Valley Estate'));
    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'Green Valley Estate')).toBe(true);

    store = [];
    await act(async () => {
      findButton(renderer.root, 'Restore')?.props.onPress();
    });

    expect(textShown(renderer.root, 'Green Valley Estate')).toBe(false);
    expect(restoreProperty.execute).toHaveBeenCalledWith({ id: 'property-1' });
  });
});
