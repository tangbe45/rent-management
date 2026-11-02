import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import { flattenSpaceTree } from './space-tree';
import { SpaceTreeView } from './space-tree-view';

jest.setTimeout(30_000);

function space(
  id: string,
  name: string,
  type: PropertySpaceType,
  options?: { parentSpaceId?: string | null; rentable?: boolean },
): PropertySpace {
  return PropertySpace.create({
    id,
    propertyId: 'property-1',
    parentSpaceId: options?.parentSpaceId ?? null,
    name,
    type,
    rentable: options?.rentable ?? false,
    createdAt: 1,
  });
}

function findButton(root: ReactTestInstance, label: string): { onPress: () => void } | undefined {
  const buttons = root.findAll((instance) => {
    const props = instance.props as { accessibilityLabel?: string; onPress?: unknown };
    return props.accessibilityLabel === label && typeof props.onPress === 'function';
  });
  return buttons[buttons.length - 1]?.props as { onPress: () => void } | undefined;
}

function textShown(root: ReactTestInstance, message: string): boolean {
  return root.findAllByType(Text).some((instance) => instance.props.children === message);
}

interface RenderOptions {
  expanded?: readonly string[];
  spies?: {
    onToggle?: jest.Mock;
    onOpen?: jest.Mock;
    onAddChild?: jest.Mock;
    onEdit?: jest.Mock;
    onArchive?: jest.Mock;
  };
}

async function renderTree(spaces: readonly PropertySpace[], options: RenderOptions = {}) {
  const onToggle = options.spies?.onToggle ?? jest.fn();
  const onOpen = options.spies?.onOpen ?? jest.fn();
  const onAddChild = options.spies?.onAddChild ?? jest.fn();
  const onEdit = options.spies?.onEdit ?? jest.fn();
  const onArchive = options.spies?.onArchive ?? jest.fn();
  const expanded = new Set(options.expanded ?? []);
  const nodes = flattenSpaceTree(spaces);

  const element = (
    <SpaceTreeView
      nodes={nodes}
      isExpanded={(id) => expanded.has(id)}
      onToggle={onToggle}
      onOpen={onOpen}
      onAddChild={onAddChild}
      onEdit={onEdit}
      onArchive={onArchive}
    />
  );

  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(element);
  });

  async function rerender(expandedIds: readonly string[]) {
    const next = new Set(expandedIds);
    await act(async () => {
      renderer.update(
        <SpaceTreeView
          nodes={nodes}
          isExpanded={(id) => next.has(id)}
          onToggle={onToggle}
          onOpen={onOpen}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onArchive={onArchive}
        />,
      );
    });
  }

  return { root: renderer.root, onToggle, onOpen, onAddChild, onEdit, onArchive, rerender };
}

const building = space('building', 'Main Building', 'BUILDING');
const room1 = space('room-1', 'Room 1', 'ROOM', { parentSpaceId: 'building', rentable: true });
const room2 = space('room-2', 'Room 2', 'ROOM', { parentSpaceId: 'building' });
const hierarchy = [building, room1, room2];

describe('SpaceTreeView', () => {
  it('renders type, child count and rentable role for every row', async () => {
    const { root } = await renderTree(hierarchy, { expanded: ['building'] });

    expect(textShown(root, 'Main Building')).toBe(true);
    expect(textShown(root, 'Room 1')).toBe(true);
    expect(textShown(root, 'Building · 2 sub-spaces · Not rentable on its own')).toBe(true);
    expect(textShown(root, 'Room · Can be rented')).toBe(true);
    expect(textShown(root, 'Room · Not rentable on its own')).toBe(true);
  });

  it('exposes an expand control for parents and hides children while collapsed', async () => {
    const { root, rerender } = await renderTree(hierarchy);

    expect(findButton(root, 'Expand Main Building')).toBeDefined();
    expect(textShown(root, 'Room 1')).toBe(false);

    await rerender(['building']);

    expect(findButton(root, 'Collapse Main Building')).toBeDefined();
    expect(textShown(root, 'Room 1')).toBe(true);
  });

  it('does not show an expand control for a leaf space', async () => {
    const { root } = await renderTree(hierarchy, { expanded: ['building'] });

    expect(findButton(root, 'Expand Room 1')).toBeUndefined();
    expect(findButton(root, 'Collapse Room 1')).toBeUndefined();
  });

  it('opens the row menu and exposes the space actions', async () => {
    const { root, onEdit, onAddChild, onArchive, onOpen } = await renderTree(hierarchy, {
      expanded: ['building'],
    });

    await act(async () => {
      findButton(root, 'Edit')?.onPress();
    });
    expect(onEdit).not.toHaveBeenCalled();

    await act(async () => {
      findButton(root, 'Space actions Room 1')?.onPress();
    });
    expect(findButton(root, 'View details')).toBeDefined();
    expect(findButton(root, 'Edit')).toBeDefined();
    expect(findButton(root, 'Add sub-space')).toBeDefined();
    expect(findButton(root, 'Archive')).toBeDefined();

    await act(async () => {
      findButton(root, 'Edit')?.onPress();
    });
    expect(onEdit).toHaveBeenCalledWith('room-1');

    await act(async () => {
      findButton(root, 'Space actions Room 1')?.onPress();
    });
    await act(async () => {
      findButton(root, 'Add sub-space')?.onPress();
    });
    expect(onAddChild).toHaveBeenCalledWith('room-1');

    await act(async () => {
      findButton(root, 'Space actions Room 1')?.onPress();
    });
    await act(async () => {
      findButton(root, 'Archive')?.onPress();
    });
    expect(onArchive).toHaveBeenCalledWith('room-1');

    await act(async () => {
      findButton(root, 'Room 1')?.onPress();
    });
    expect(onOpen).toHaveBeenCalledWith('room-1');
  });

  it('renders nothing for an empty tree', async () => {
    const { root } = await renderTree([]);

    expect(root.findAllByType(Text)).toHaveLength(0);
  });
});
