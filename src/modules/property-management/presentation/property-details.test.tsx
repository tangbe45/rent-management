import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { Property } from '../domain/property';
import { PropertyDetails } from './property-details';

jest.setTimeout(30_000);

function buildProperty(id: string, archivedAt: number | null): Property {
  const base = Property.create({ id, name: 'Green Valley Estate', address: '12 Main Street', createdAt: 1 });
  return archivedAt === null ? base : base.archive(archivedAt);
}

function findButton(root: ReactTestInstance, label: string) {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  return buttons;
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

async function renderDetails(property: Property) {
  const onEdit = jest.fn();
  const onArchive = jest.fn();
  const onRestore = jest.fn();
  const onBack = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <PropertyDetails
        property={property}
        onEdit={onEdit}
        onArchive={onArchive}
        onRestore={onRestore}
        onBack={onBack}
      />,
    );
  });
  return { root: renderer.root, onEdit, onArchive, onRestore, onBack };
}

describe('PropertyDetails', () => {
  it('offers edit and archive for an active property', async () => {
    const { root, onArchive } = await renderDetails(buildProperty('p1', null));

    expect(textShown(root, 'Green Valley Estate')).toBe(true);
    expect(findButton(root, 'Archive')).toHaveLength(1);
    expect(findButton(root, 'Restore')).toHaveLength(0);

    await act(async () => {
      findButton(root, 'Archive')[0]!.props.onPress();
    });

    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it('offers edit and restore for an archived property', async () => {
    const { root, onRestore } = await renderDetails(buildProperty('p2', 2000));

    expect(textShown(root, 'Archived')).toBe(true);
    expect(findButton(root, 'Restore')).toHaveLength(1);
    expect(findButton(root, 'Archive')).toHaveLength(0);

    await act(async () => {
      findButton(root, 'Restore')[0]!.props.onPress();
    });

    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('surfaces an archive-blocked error', async () => {
    const property = buildProperty('p3', null);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <PropertyDetails
          property={property}
          error="Ce bien ne peut pas être archivé car il a des contrats de location actifs."
          onEdit={jest.fn()}
          onArchive={jest.fn()}
          onRestore={jest.fn()}
          onBack={jest.fn()}
        />,
      );
    });

    expect(
      textShown(renderer.root, 'Ce bien ne peut pas être archivé car il a des contrats de location actifs.'),
    ).toBe(true);
  });
});