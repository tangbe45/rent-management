import { router } from 'expo-router';
import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Property } from '../domain/property';
import { createProperty, getProperty, updateProperty } from '../infrastructure/composition-root';
import { PropertyFormScreen } from './property-form-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('../infrastructure/composition-root', () => ({
  createProperty: { execute: jest.fn() },
  getProperty: { execute: jest.fn() },
  updateProperty: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildProperty(id: string, name: string, address = '12 Main Street'): Property {
  return Property.create({ id, name, address, createdAt: 1 });
}

function findInput(root: ReactTestInstance, label: string) {
  const inputs = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onChangeText?: unknown };
    const parentProps = instance.parent?.props as { accessibilityLabel?: string } | undefined;
    return (
      props.accessibilityLabel === label &&
      typeof props.onChangeText === 'function' &&
      parentProps?.accessibilityLabel !== label
    );
  });
  expect(inputs).toHaveLength(1);
  return inputs[0]!.props as { value: string; onChangeText: (value: string) => void };
}

function findButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(buttons.length).toBeGreaterThanOrEqual(1);
  return buttons[buttons.length - 1]!.props as { onPress: () => void };
}

async function renderScreen(propertyId: string): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<PropertyFormScreen mode="edit" propertyId={propertyId} />);
  });
  return renderer;
}

describe('PropertyFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the fields from the loaded record and re-initializes when a different record is loaded', async () => {
    jest.mocked(getProperty.execute).mockReturnValue(buildProperty('p1', 'Green Valley Estate'));
    const renderer = await renderScreen('p1');
    expect(findInput(renderer.root, 'Name').value).toBe('Green Valley Estate');

    jest.mocked(getProperty.execute).mockReturnValue(buildProperty('p2', 'Sunset Court'));
    await act(async () => {
      renderer.update(<PropertyFormScreen mode="edit" propertyId="p2" />);
    });

    expect(findInput(renderer.root, 'Name').value).toBe('Sunset Court');
    expect(findInput(renderer.root, 'Address').value).toBe('12 Main Street');
  });

  it('submits the edited values through the update use case and returns', async () => {
    jest.mocked(getProperty.execute).mockReturnValue(buildProperty('p1', 'Green Valley Estate'));
    const renderer = await renderScreen('p1');

    await act(async () => {
      findInput(renderer.root, 'Name').onChangeText('Sunset Court');
      findInput(renderer.root, 'Address').onChangeText('4 Beach Road');
      findInput(renderer.root, 'Description').onChangeText('Near the sea');
    });
    await act(async () => {
      findButton(renderer.root, 'Save').onPress();
    });

    expect(updateProperty.execute).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Sunset Court',
      address: '4 Beach Road',
      description: 'Near the sea',
    });
  });

  it('does not submit and reports the error when the update use case rejects', async () => {
    jest.mocked(getProperty.execute).mockReturnValue(buildProperty('p1', 'Green Valley Estate'));
    jest.mocked(updateProperty.execute).mockImplementation(() => {
      throw new Error('boom');
    });
    const renderer = await renderScreen('p1');

    await act(async () => {
      findButton(renderer.root, 'Save').onPress();
    });

    expect(
      renderer.root
        .findAllByType(Text)
        .some((instance) => instance.props.children === 'Something went wrong. Please try again.'),
    ).toBe(true);
    expect(findInput(renderer.root, 'Name').value).toBe('Green Valley Estate');
  });

  it('navigates to the new workspace after creating a property', async () => {
    const created = buildProperty('created-1', 'New Place', '1 New Road');
    jest.mocked(createProperty.execute).mockReturnValue(created);

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<PropertyFormScreen mode="create" />);
    });
    await act(async () => {
      findInput(renderer.root, 'Name').onChangeText('New Place');
      findInput(renderer.root, 'Address').onChangeText('1 New Road');
    });
    await act(async () => {
      findButton(renderer.root, 'Save').onPress();
    });

    expect(createProperty.execute).toHaveBeenCalledWith({
      name: 'New Place',
      address: '1 New Road',
      description: '',
    });
    expect(router.replace).toHaveBeenCalledWith('/properties/created-1');
    expect(router.back).not.toHaveBeenCalled();
  });
});
