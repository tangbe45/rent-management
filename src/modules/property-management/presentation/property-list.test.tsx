import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { Property } from '../domain/property';
import { PropertyList } from './property-list';

jest.setTimeout(30_000);

afterEach(() => {
  setLocale('en');
});

function buildProperty(id: string, name: string, address: string): Property {
  return Property.create({ id, name, address, createdAt: 1 });
}

function findButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(buttons.length).toBeGreaterThanOrEqual(1);
  return buttons[buttons.length - 1]!.props as { onPress: () => void };
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root
    .findAllByType(Text)
    .some((instance) => instance.props.children === message);
}

async function renderList(properties: readonly Property[]) {
  const onOpen = jest.fn();
  const onCreate = jest.fn();
  const onOpenArchived = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <PropertyList
        properties={properties}
        onOpen={onOpen}
        onCreate={onCreate}
        onOpenArchived={onOpenArchived}
      />,
    );
  });
  return { root: renderer.root, onOpen, onCreate, onOpenArchived };
}

describe('PropertyList', () => {
  it('renders each active property and opens it by id', async () => {
    const { root, onOpen } = await renderList([
      buildProperty('p1', 'Green Valley Estate', '12 Main Street'),
      buildProperty('p2', 'Sunset Court', '4 Beach Road'),
    ]);

    expect(textShown(root, 'Green Valley Estate')).toBe(true);
    expect(textShown(root, '12 Main Street')).toBe(true);

    await act(async () => {
      findButton(root, 'Sunset Court').onPress();
    });

    expect(onOpen).toHaveBeenCalledWith('p2');
  });

  it('shows an empty message when there are no active properties', async () => {
    const { root } = await renderList([]);

    expect(textShown(root, 'No properties yet.')).toBe(true);
  });

  it('exposes actions to create a property and view archived properties', async () => {
    const { root, onCreate, onOpenArchived } = await renderList([]);

    await act(async () => {
      findButton(root, 'Add property').onPress();
      findButton(root, 'Archived properties').onPress();
    });

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onOpenArchived).toHaveBeenCalledTimes(1);
  });

  it('renders translated labels with the concept emoji when the locale is French', async () => {
    setLocale('fr');
    const { root } = await renderList([]);

    expect(textShown(root, '🏠 Biens')).toBe(true);
    expect(textShown(root, 'Aucun bien pour le moment.')).toBe(true);
    expect(textShown(root, 'Ajouter un bien')).toBe(true);
    expect(textShown(root, 'Biens archivés')).toBe(true);
  });
});