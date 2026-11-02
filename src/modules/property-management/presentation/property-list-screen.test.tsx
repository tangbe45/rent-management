import { useFocusEffect } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Property } from '../domain/property';
import { listProperties } from '../infrastructure/composition-root';
import { PropertyListScreen } from './property-list-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../infrastructure/composition-root', () => ({
  listProperties: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildProperty(id: string, name: string): Property {
  return Property.create({ id, name, address: '12 Main Street', createdAt: 1 });
}

function textShown(root: ReactTestInstance, fragment: string): boolean {
  return root
    .findAllByType(Text)
    .some(
      (instance) =>
        typeof instance.props.children === 'string' && instance.props.children === fragment,
    );
}

function countText(root: ReactTestInstance, fragment: string): number {
  return root
    .findAllByType(Text)
    .filter((instance) => instance.props.children === fragment).length;
}

async function renderScreen(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<PropertyListScreen />);
  });
  return renderer;
}

/**
 * Execute the callback the screen registered with `useFocusEffect`, emulating
 * the navigation focus event that fires when the user returns to the list.
 */
function emitFocus(): void {
  const calls = jest.mocked(useFocusEffect).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const callback = calls[calls.length - 1]![0];
  act(() => {
    callback();
  });
}

describe('PropertyListScreen', () => {
  let store: Property[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [];
    jest.mocked(listProperties.execute).mockImplementation(() => [...store]);
  });

  it('shows a property created on another screen on return, without remounting', async () => {
    const renderer = await renderScreen();
    expect(textShown(renderer.root, 'No properties yet.')).toBe(true);

    store.push(buildProperty('property-1', 'Green Valley Estate'));

    emitFocus();

    expect(textShown(renderer.root, 'Green Valley Estate')).toBe(true);
  });

  it('registers the refresh on the focus lifecycle, not just on mount', async () => {
    await renderScreen();

    expect(useFocusEffect).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate records when the screen is focused repeatedly', async () => {
    const renderer = await renderScreen();

    store.push(buildProperty('property-1', 'Green Valley Estate'));

    emitFocus();
    emitFocus();
    emitFocus();

    expect(countText(renderer.root, 'Green Valley Estate')).toBe(1);
  });

  it('does not show a record when creation did not persist', async () => {
    const renderer = await renderScreen();

    emitFocus();

    expect(textShown(renderer.root, 'No properties yet.')).toBe(true);
    expect(countText(renderer.root, 'Green Valley Estate')).toBe(0);
  });
});
