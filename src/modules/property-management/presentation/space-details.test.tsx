import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import { SpaceDetails } from './space-details';

jest.setTimeout(30_000);

function buildSpace(
  options: { archivedAt?: number; rentable?: boolean; type?: PropertySpaceType } = {},
): PropertySpace {
  const base = PropertySpace.create({
    id: 'space-1',
    propertyId: 'property-1',
    parentSpaceId: null,
    name: 'Apartment A',
    type: options.type ?? 'APARTMENT',
    rentable: options.rentable ?? true,
    createdAt: 1,
  });
  return options.archivedAt !== undefined ? base.archive(options.archivedAt) : base;
}

function findButtons(root: ReactTestInstance, label: string) {
  return root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

async function renderDetails(overrides: {
  space: PropertySpace;
  parentName?: string | null;
  childrenNames?: readonly string[];
  error?: string;
}) {
  const handlers = {
    onEdit: jest.fn(),
    onAddChild: jest.fn(),
    onCreateAgreement: jest.fn(),
    onArchive: jest.fn(),
    onRestore: jest.fn(),
    onBack: jest.fn(),
  };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SpaceDetails
        space={overrides.space}
        parentName={overrides.parentName ?? null}
        childrenNames={overrides.childrenNames ?? []}
        error={overrides.error}
        {...handlers}
      />,
    );
  });
  return { root: renderer.root, ...handlers };
}

describe('SpaceDetails', () => {
  it('shows type, rentable state, parent and children for an active space', async () => {
    const { root } = await renderDetails({
      space: buildSpace(),
      parentName: 'Ground Floor',
      childrenNames: ['Room 1', 'Room 2'],
    });

    expect(textShown(root, 'Apartment A')).toBe(true);
    expect(textShown(root, '🏠')).toBe(true);
    expect(textShown(root, 'Apartment')).toBe(true);
    expect(textShown(root, 'Rentable')).toBe(true);
    expect(textShown(root, 'Ground Floor')).toBe(true);
    expect(textShown(root, 'Room 1, Room 2')).toBe(true);
    expect(findButtons(root, 'Add sub-space')).toHaveLength(1);
    expect(findButtons(root, 'New rental agreement')).toHaveLength(1);
    expect(findButtons(root, 'Archive')).toHaveLength(1);
    expect(findButtons(root, 'Restore')).toHaveLength(0);
  });

  it('shows top level and none when there is no parent or child', async () => {
    const { root } = await renderDetails({ space: buildSpace({ type: 'ROOM', rentable: false }) });

    expect(textShown(root, 'Top level')).toBe(true);
    expect(textShown(root, 'None')).toBe(true);
    expect(textShown(root, 'Not rentable')).toBe(true);
    expect(findButtons(root, 'New rental agreement')).toHaveLength(0);
  });

  it('offers restore instead of archive and no add-child for an archived space', async () => {
    const { root } = await renderDetails({ space: buildSpace({ archivedAt: 2000 }) });

    expect(textShown(root, 'Archived')).toBe(true);
    expect(findButtons(root, 'Restore')).toHaveLength(1);
    expect(findButtons(root, 'Archive')).toHaveLength(0);
    expect(findButtons(root, 'Add sub-space')).toHaveLength(0);
    expect(findButtons(root, 'New rental agreement')).toHaveLength(0);
  });

  it('surfaces an error and fires actions', async () => {
    const { root, onArchive, onRestore, onBack } = await renderDetails({
      space: buildSpace(),
      error: 'Another active space already uses this name here.',
    });

    expect(textShown(root, 'Another active space already uses this name here.')).toBe(true);

    await act(async () => {
      findButtons(root, 'Archive')[0]!.props.onPress();
      findButtons(root, 'Back')[0]!.props.onPress();
    });

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(onRestore).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});