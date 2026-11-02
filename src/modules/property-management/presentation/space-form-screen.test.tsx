import { router } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { setLocale } from '../../../shared/i18n';
import { PropertySpaceNameAlreadyExistsError } from '../application/property-space-errors';
import { Property } from '../domain/property';
import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import {
  createPropertySpace,
  getProperty,
  getPropertySpace,
  listPropertySpaces,
  movePropertySpace,
  updatePropertySpace,
} from '../infrastructure/composition-root';
import { SpaceFormScreen } from './space-form-screen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

jest.mock('../infrastructure/composition-root', () => ({
  createPropertySpace: { execute: jest.fn() },
  getProperty: { execute: jest.fn() },
  getPropertySpace: { execute: jest.fn() },
  listPropertySpaces: { execute: jest.fn() },
  movePropertySpace: { execute: jest.fn() },
  updatePropertySpace: { execute: jest.fn() },
}));

jest.setTimeout(30_000);

function buildProperty(): Property {
  return Property.create({
    id: 'property-1',
    name: 'Green House',
    address: '12 Main Street',
    createdAt: 1,
  });
}

function buildSpace(options: {
  id: string;
  name: string;
  type?: PropertySpaceType;
  parentSpaceId?: string | null;
  rentable?: boolean;
  archivedAt?: number;
}): PropertySpace {
  const base = PropertySpace.create({
    id: options.id,
    propertyId: 'property-1',
    parentSpaceId: options.parentSpaceId ?? null,
    name: options.name,
    type: options.type ?? 'ROOM',
    rentable: options.rentable ?? false,
    createdAt: 1,
  });
  return options.archivedAt === undefined ? base : base.archive(options.archivedAt);
}

function findButton(root: ReactTestInstance, label: string) {
  const matches = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  expect(matches.length).toBeGreaterThanOrEqual(1);
  return matches[matches.length - 1]!.props as {
    onPress: () => void;
    accessibilityState?: { selected?: boolean };
  };
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

function nameInput(root: ReactTestInstance): { value: string; onChangeText: (v: string) => void } {
  return root.findAllByType(TextInput)[0]!.props as {
    value: string;
    onChangeText: (v: string) => void;
  };
}

async function renderScreen(
  props: { mode: 'create' | 'edit'; spaceId?: string; initialParentId?: string | null },
): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <SpaceFormScreen
        mode={props.mode}
        propertyId="property-1"
        spaceId={props.spaceId}
        initialParentId={props.initialParentId}
      />,
    );
  });
  return renderer;
}

describe('SpaceFormScreen', () => {
  const building = buildSpace({ id: 'building', name: 'Main Building', type: 'BUILDING' });

  beforeEach(() => {
    setLocale('en');
    jest.clearAllMocks();
    jest.mocked(getProperty.execute).mockReturnValue(buildProperty());
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building]);
  });

  it('initializes the fields from the loaded space and re-initializes when a different space is loaded', async () => {
    const first = buildSpace({ id: 'space-1', name: 'Room A', type: 'ROOM' });
    jest.mocked(getPropertySpace.execute).mockReturnValue(first);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building, first]);

    const renderer = await renderScreen({ mode: 'edit', spaceId: 'space-1' });
    expect(nameInput(renderer.root).value).toBe('Room A');

    const second = buildSpace({ id: 'space-2', name: 'Office B', type: 'OFFICE' });
    jest.mocked(getPropertySpace.execute).mockReturnValue(second);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building, second]);

    await act(async () => {
      renderer.update(
        <SpaceFormScreen mode="edit" propertyId="property-1" spaceId="space-2" />,
      );
    });

    expect(nameInput(renderer.root).value).toBe('Office B');
  });

  it('submits name, type, rentable and parent move through the use cases', async () => {
    const first = buildSpace({ id: 'space-1', name: 'Room A', type: 'ROOM', rentable: false });
    jest.mocked(getPropertySpace.execute).mockReturnValue(first);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building, first]);

    const renderer = await renderScreen({ mode: 'edit', spaceId: 'space-1' });

    await act(async () => {
      nameInput(renderer.root).onChangeText('Room B');
      findButton(renderer.root, 'Office').onPress();
      findButton(renderer.root, 'Main Building').onPress();
      findButton(renderer.root, 'Yes — It can be rented independently').onPress();
    });
    await act(async () => {
      findButton(renderer.root, 'Save changes').onPress();
    });

    expect(movePropertySpace.execute).toHaveBeenCalledWith({
      id: 'space-1',
      parentSpaceId: 'building',
    });
    expect(updatePropertySpace.execute).toHaveBeenCalledWith({
      id: 'space-1',
      name: 'Room B',
      type: 'OFFICE',
      rentable: true,
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('creates a top-level space by default and shows the property context', async () => {
    const renderer = await renderScreen({ mode: 'create' });

    expect(textShown(renderer.root, 'In Green House')).toBe(true);
    expect(findButton(renderer.root, 'Top-level space').accessibilityState?.selected).toBe(true);

    await act(async () => {
      nameInput(renderer.root).onChangeText('Office 2');
      findButton(renderer.root, 'Office').onPress();
    });
    await act(async () => {
      findButton(renderer.root, 'Save space').onPress();
    });

    expect(createPropertySpace.execute).toHaveBeenCalledWith({
      propertyId: 'property-1',
      parentSpaceId: null,
      name: 'Office 2',
      type: 'OFFICE',
      rentable: false,
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('preselects the supplied parent when adding a child', async () => {
    const renderer = await renderScreen({
      mode: 'create',
      initialParentId: 'building',
    });

    expect(findButton(renderer.root, 'Main Building').accessibilityState?.selected).toBe(true);
    expect(findButton(renderer.root, 'Top-level space').accessibilityState?.selected).toBe(false);
  });

  it('excludes the space itself and its descendants from the parent options', async () => {
    const floor = buildSpace({
      id: 'floor',
      name: 'Floor X',
      type: 'FLOOR',
      parentSpaceId: 'building',
    });
    const roomA = buildSpace({
      id: 'room-a',
      name: 'Room Alpha',
      type: 'ROOM',
      parentSpaceId: 'floor',
    });
    const roomAChild = buildSpace({
      id: 'room-a-child',
      name: 'Nook Beta',
      type: 'ROOM',
      parentSpaceId: 'room-a',
    });
    jest.mocked(getPropertySpace.execute).mockReturnValue(roomA);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building, floor, roomA, roomAChild]);

    const renderer = await renderScreen({ mode: 'edit', spaceId: 'room-a' });

    expect(textShown(renderer.root, 'Main Building')).toBe(true);
    expect(textShown(renderer.root, 'Floor X')).toBe(true);
    expect(textShown(renderer.root, 'Room Alpha')).toBe(false);
    expect(textShown(renderer.root, 'Nook Beta')).toBe(false);
  });

  it('does not offer archived spaces as parents', async () => {
    const archived = buildSpace({
      id: 'old',
      name: 'Old Store',
      type: 'SHOP',
      archivedAt: 2000,
    });
    const active = buildSpace({ id: 'space-1', name: 'Room A', type: 'ROOM' });
    jest.mocked(getPropertySpace.execute).mockReturnValue(active);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building, archived, active]);

    const renderer = await renderScreen({ mode: 'edit', spaceId: 'space-1' });

    expect(textShown(renderer.root, 'Main Building')).toBe(true);
    expect(textShown(renderer.root, 'Old Store')).toBe(false);
  });

  it('preserves entered values and shows an error when the save fails', async () => {
    const first = buildSpace({ id: 'space-1', name: 'Room A', type: 'ROOM' });
    jest.mocked(getPropertySpace.execute).mockReturnValue(first);
    jest.mocked(listPropertySpaces.execute).mockReturnValue([building, first]);
    jest.mocked(updatePropertySpace.execute).mockImplementation(() => {
      throw new PropertySpaceNameAlreadyExistsError('Room B');
    });

    const renderer = await renderScreen({ mode: 'edit', spaceId: 'space-1' });

    await act(async () => {
      nameInput(renderer.root).onChangeText('Room B');
    });
    await act(async () => {
      findButton(renderer.root, 'Save changes').onPress();
    });

    expect(textShown(renderer.root, 'Another active space already uses this name here.')).toBe(true);
    expect(nameInput(renderer.root).value).toBe('Room B');
    expect(router.back).not.toHaveBeenCalled();
  });
});
