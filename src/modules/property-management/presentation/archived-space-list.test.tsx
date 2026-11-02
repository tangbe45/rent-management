import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import { ArchivedSpaceList } from './archived-space-list';

jest.setTimeout(30_000);

function archivedSpace(id: string, name: string, type: PropertySpaceType): PropertySpace {
  return PropertySpace.create({
    id,
    propertyId: 'property-1',
    parentSpaceId: null,
    name,
    type,
    rentable: false,
    createdAt: 1,
  }).archive(2000);
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

async function renderList(spaces: readonly PropertySpace[], error?: string) {
  const onOpen = jest.fn();
  const onRestore = jest.fn();
  const onBack = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <ArchivedSpaceList
        propertyName="Green Valley Estate"
        spaces={spaces}
        error={error}
        onOpen={onOpen}
        onRestore={onRestore}
        onBack={onBack}
      />,
    );
  });
  return { root: renderer.root, onOpen, onRestore, onBack };
}

describe('ArchivedSpaceList', () => {
  it('lists archived spaces with their type', async () => {
    const { root } = await renderList([archivedSpace('old', 'Old Store', 'SHOP')]);

    expect(textShown(root, 'Old Store')).toBe(true);
    expect(textShown(root, '🛍️ Shop')).toBe(true);
  });

  it('shows an empty message when nothing is archived', async () => {
    const { root } = await renderList([]);

    expect(textShown(root, 'No archived spaces.')).toBe(true);
  });

  it('opens and restores a space through the use-case callbacks', async () => {
    const { root, onOpen, onRestore } = await renderList([
      archivedSpace('old', 'Old Store', 'SHOP'),
    ]);

    await act(async () => {
      findButton(root, 'View details')?.onPress();
    });
    await act(async () => {
      findButton(root, 'Restore')?.onPress();
    });

    expect(onOpen).toHaveBeenCalledWith('old');
    expect(onRestore).toHaveBeenCalledWith('old');
  });

  it('surfaces an error message', async () => {
    const { root } = await renderList([], 'Une erreur est survenue.');

    expect(textShown(root, 'Une erreur est survenue.')).toBe(true);
  });
});
