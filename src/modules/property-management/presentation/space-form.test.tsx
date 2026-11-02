import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { PROPERTY_SPACE_TYPES } from '../domain/property-space';
import {
  SpaceForm,
  type SpaceFormMode,
  type SpaceFormValues,
  type SpaceParentOption,
} from './space-form';

jest.setTimeout(30_000);

const TYPE_LABELS: Record<string, string> = {
  BUILDING: 'Building',
  FLOOR: 'Floor',
  APARTMENT: 'Apartment',
  STUDIO: 'Studio',
  ROOM: 'Room',
  SHOP: 'Shop',
  OFFICE: 'Office',
  WAREHOUSE: 'Warehouse',
  OTHER: 'Other',
};

const parentOptions: readonly SpaceParentOption[] = [
  { id: 'building', name: 'Main Building', type: 'BUILDING', depth: 0 },
  { id: 'ground', name: 'Ground Floor', type: 'FLOOR', depth: 1 },
];

function findButton(root: ReactTestInstance, label: string) {
  const matches = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(matches.length).toBeGreaterThanOrEqual(1);
  return matches[matches.length - 1]!.props as {
    onPress: () => void;
    accessibilityState?: { selected?: boolean; checked?: boolean };
    style?: unknown;
  };
}

function marginLeftOf(root: ReactTestInstance, label: string): number {
  const flattened = ([] as unknown[]).concat(findButton(root, label).style ?? []);
  const margin = flattened
    .filter((entry): entry is { marginLeft: number } =>
      Boolean(entry && typeof entry === 'object' && 'marginLeft' in entry),
    )
    .reduce((total, entry) => total + entry.marginLeft, 0);
  return margin;
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

function nameInput(root: ReactTestInstance): { value: string; placeholder?: string } {
  return root.findAllByType(TextInput)[0]!.props as { value: string; placeholder?: string };
}

async function renderForm(options: {
  mode: SpaceFormMode;
  propertyName?: string;
  initialValues?: Partial<SpaceFormValues>;
  error?: string;
  parentOptions?: readonly SpaceParentOption[];
}) {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SpaceForm
        mode={options.mode}
        propertyName={options.propertyName}
        initialValues={options.initialValues}
        parentOptions={options.parentOptions ?? parentOptions}
        error={options.error}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
  });
  return { root: renderer.root, onSubmit, onCancel };
}

describe('SpaceForm', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('offers all nine space types with their localized labels and emojis', async () => {
    const { root } = await renderForm({ mode: 'create' });

    expect(PROPERTY_SPACE_TYPES).toHaveLength(9);
    for (const type of PROPERTY_SPACE_TYPES) {
      expect(findButton(root, TYPE_LABELS[type]!)).toBeDefined();
    }
    expect(textShown(root, '🏢')).toBe(true);
    expect(textShown(root, '🛍️')).toBe(true);
    expect(textShown(root, '📦')).toBe(true);
  });

  it('makes the selected type visually distinguishable', async () => {
    const { root } = await renderForm({ mode: 'create' });

    expect(findButton(root, 'Room').accessibilityState?.selected).toBe(true);
    expect(findButton(root, 'Office').accessibilityState?.selected).toBe(false);
    expect(textShown(root, '✓')).toBe(true);

    await act(async () => {
      findButton(root, 'Office').onPress();
    });

    expect(findButton(root, 'Office').accessibilityState?.selected).toBe(true);
    expect(findButton(root, 'Room').accessibilityState?.selected).toBe(false);
  });

  it('requires a non-empty name and shows the error next to the field', async () => {
    const { root, onSubmit } = await renderForm({ mode: 'create' });

    await act(async () => {
      findButton(root, 'Save space').onPress();
    });

    expect(textShown(root, 'Space name is required.')).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('collects name, type, parent and rentable on create', async () => {
    const { root, onSubmit } = await renderForm({ mode: 'create' });

    expect(textShown(root, '🏢 Add space')).toBe(true);
    await act(async () => {
      (root.findAllByType(TextInput)[0]!.props as { onChangeText: (v: string) => void }).onChangeText(
        'Room 1',
      );
    });
    await act(async () => {
      findButton(root, 'Warehouse').onPress();
    });
    await act(async () => {
      findButton(root, 'Main Building').onPress();
    });
    await act(async () => {
      findButton(root, 'Yes — It can be rented independently').onPress();
    });
    await act(async () => {
      findButton(root, 'Save space').onPress();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Room 1',
      type: 'WAREHOUSE',
      parentSpaceId: 'building',
      rentable: true,
    });
  });

  it('defaults to a top-level space for a general add', async () => {
    const { root } = await renderForm({ mode: 'create', propertyName: 'Green House' });

    expect(findButton(root, 'Top-level space').accessibilityState?.selected).toBe(true);
    expect(findButton(root, 'Main Building').accessibilityState?.selected).toBe(false);
    expect(textShown(root, 'In Green House')).toBe(true);
  });

  it('preselects the supplied parent when adding a child', async () => {
    const { root } = await renderForm({
      mode: 'create',
      initialValues: { parentSpaceId: 'building' },
    });

    expect(findButton(root, 'Main Building').accessibilityState?.selected).toBe(true);
    expect(findButton(root, 'Top-level space').accessibilityState?.selected).toBe(false);
  });

  it('shows the hierarchy with the property at the root and indented children', async () => {
    const { root } = await renderForm({ mode: 'create', propertyName: 'Green House' });

    expect(textShown(root, 'Green House')).toBe(true);
    expect(textShown(root, 'Property')).toBe(true);
    expect(textShown(root, 'Main Building')).toBe(true);
    expect(textShown(root, 'Ground Floor')).toBe(true);
    expect(marginLeftOf(root, 'Ground Floor')).toBeGreaterThan(
      marginLeftOf(root, 'Main Building'),
    );
  });

  it('reflects and updates the rentable boolean through two explicit choices', async () => {
    const { root, onSubmit } = await renderForm({ mode: 'create' });

    expect(
      findButton(root, 'No — It is part of a larger space').accessibilityState?.selected,
    ).toBe(true);

    await act(async () => {
      findButton(root, 'Yes — It can be rented independently').onPress();
    });

    expect(
      findButton(root, 'Yes — It can be rented independently').accessibilityState?.selected,
    ).toBe(true);
    expect(findButton(root, 'Yes — It can be rented independently').accessibilityState?.checked).toBe(
      true,
    );

    await act(async () => {
      (root.findAllByType(TextInput)[0]!.props as { onChangeText: (v: string) => void }).onChangeText(
        'Room 1',
      );
    });
    await act(async () => {
      findButton(root, 'Save space').onPress();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0].rentable).toBe(true);
  });

  it('adapts the name placeholder to the selected type', async () => {
    const { root } = await renderForm({ mode: 'create' });

    expect(nameInput(root).placeholder).toBe('e.g. Room 1');

    await act(async () => {
      findButton(root, 'Warehouse').onPress();
    });

    expect(nameInput(root).placeholder).toBe('e.g. Warehouse A');
  });

  it('updates the summary preview as fields change', async () => {
    const { root } = await renderForm({ mode: 'create' });

    expect(textShown(root, '🚪 Room')).toBe(true);
    expect(textShown(root, 'Top-level space · Part of a larger space')).toBe(true);

    await act(async () => {
      (root.findAllByType(TextInput)[0]!.props as { onChangeText: (v: string) => void }).onChangeText(
        'Apartment A',
      );
      findButton(root, 'Apartment').onPress();
      findButton(root, 'Yes — It can be rented independently').onPress();
    });

    expect(textShown(root, '🏠 Apartment A')).toBe(true);
    expect(textShown(root, 'Top-level space · Can be rented independently')).toBe(true);
  });

  it('prefills values in edit mode and saves changes', async () => {
    const { root, onSubmit } = await renderForm({
      mode: 'edit',
      initialValues: {
        name: 'Apartment A',
        type: 'APARTMENT',
        parentSpaceId: 'ground',
        rentable: true,
      },
    });

    expect(textShown(root, '🏢 Edit space')).toBe(true);
    expect(nameInput(root).value).toBe('Apartment A');
    expect(findButton(root, 'Apartment').accessibilityState?.selected).toBe(true);
    expect(findButton(root, 'Ground Floor').accessibilityState?.selected).toBe(true);
    expect(
      findButton(root, 'Yes — It can be rented independently').accessibilityState?.selected,
    ).toBe(true);

    await act(async () => {
      findButton(root, 'Save changes').onPress();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Apartment A',
      type: 'APARTMENT',
      parentSpaceId: 'ground',
      rentable: true,
    });
  });

  it('preserves entered values and shows the error when a save fails', async () => {
    const { root, onSubmit } = await renderForm({
      mode: 'edit',
      initialValues: { name: 'Apartment A', type: 'APARTMENT', parentSpaceId: null, rentable: true },
      error: 'Another active space already uses this name here.',
    });

    expect(nameInput(root).value).toBe('Apartment A');
    expect(textShown(root, 'Another active space already uses this name here.')).toBe(true);

    await act(async () => {
      (root.findAllByType(TextInput)[0]!.props as { onChangeText: (v: string) => void }).onChangeText(
        'Apartment B',
      );
    });
    await act(async () => {
      findButton(root, 'Save changes').onPress();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Apartment B',
      type: 'APARTMENT',
      parentSpaceId: null,
      rentable: true,
    });
  });

  it('only offers the parent options it is given', async () => {
    const { root } = await renderForm({
      mode: 'edit',
      initialValues: { name: 'Room 1', type: 'ROOM', parentSpaceId: null, rentable: false },
      parentOptions: [{ id: 'building', name: 'Main Building', type: 'BUILDING', depth: 0 }],
    });

    expect(textShown(root, 'Main Building')).toBe(true);
    expect(textShown(root, 'Hidden Child')).toBe(false);
    expect(textShown(root, 'Room 1')).toBe(false);
  });

  it('cancels through the secondary action', async () => {
    const { root, onCancel } = await renderForm({ mode: 'create' });

    await act(async () => {
      findButton(root, 'Cancel').onPress();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
