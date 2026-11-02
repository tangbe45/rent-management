import { PropertySpace, type PropertySpaceType } from '../domain/property-space';
import { collectDescendantIds, flattenSpaceTree, visibleSpaceRows } from './space-tree';

function space(
  id: string,
  parentSpaceId: string | null = null,
  name: string = id,
  type: PropertySpaceType = 'ROOM',
): PropertySpace {
  return PropertySpace.create({
    id,
    propertyId: 'property-1',
    parentSpaceId,
    name,
    type,
    rentable: false,
    createdAt: 1,
  });
}

describe('flattenSpaceTree', () => {
  it('lists parents before their descendants with increasing depth', () => {
    const spaces = [
      space('shop', null, 'Shop Block', 'BUILDING'),
      space('a', 'ground', 'Apartment A', 'APARTMENT'),
      space('ground', 'building', 'Ground Floor', 'FLOOR'),
      space('building', null, 'Main Building', 'BUILDING'),
      space('b', 'ground', 'Apartment B', 'APARTMENT'),
      space('shop1', 'shop', 'Shop 1', 'SHOP'),
    ];

    const flat = flattenSpaceTree(spaces);

    expect(flat.map((node) => node.space.id)).toEqual([
      'building',
      'ground',
      'a',
      'b',
      'shop',
      'shop1',
    ]);
    expect(flat.map((node) => node.depth)).toEqual([0, 1, 2, 2, 0, 1]);
  });

  it('treats a space whose parent is absent as a root so no node is lost', () => {
    const flat = flattenSpaceTree([space('orphan', 'missing', 'Orphan')]);

    expect(flat).toHaveLength(1);
    expect(flat[0]?.depth).toBe(0);
  });

  it('returns an empty list for no spaces', () => {
    expect(flattenSpaceTree([])).toEqual([]);
  });

  it('annotates each node with its direct child count', () => {
    const flat = flattenSpaceTree([
      space('building', null, 'Main Building'),
      space('a', 'building', 'Apartment A'),
      space('b', 'building', 'Apartment B'),
      space('leaf', 'a', 'Room'),
    ]);

    const counts = Object.fromEntries(flat.map((node) => [node.space.id, node.childCount]));
    expect(counts).toEqual({ building: 2, a: 1, b: 0, leaf: 0 });
  });
});

describe('visibleSpaceRows', () => {
  const spaces = [
    space('building', null, 'Main Building'),
    space('ground', 'building', 'Ground Floor'),
    space('a', 'ground', 'Apartment A'),
    space('shop', null, 'Shop Block'),
    space('shop-1', 'shop', 'Shop 1'),
  ];

  function visibleIds(isExpanded: readonly string[]): string[] {
    const expanded = new Set(isExpanded);
    return visibleSpaceRows(flattenSpaceTree(spaces), (id) => expanded.has(id)).map(
      (node) => node.space.id,
    );
  }

  it('shows only roots when everything is collapsed', () => {
    expect(visibleIds([])).toEqual(['building', 'shop']);
  });

  it('reveals the direct children of an expanded parent only', () => {
    expect(visibleIds(['building'])).toEqual(['building', 'ground', 'shop']);
  });

  it('reveals deeper levels as each ancestor is expanded', () => {
    expect(visibleIds(['building', 'ground'])).toEqual(['building', 'ground', 'a', 'shop']);
  });

  it('keeps later roots visible after a collapsed subtree', () => {
    expect(visibleIds(['shop'])).toEqual(['building', 'shop', 'shop-1']);
  });
});

describe('collectDescendantIds', () => {
  it('collects the whole subtree of a space', () => {
    const spaces = [
      space('building', null, 'Main Building'),
      space('ground', 'building', 'Ground Floor'),
      space('a', 'ground', 'Apartment A'),
      space('b', 'ground', 'Apartment B'),
      space('other', null, 'Other Root'),
    ];

    expect([...collectDescendantIds('building', spaces)].sort()).toEqual(['a', 'b', 'ground']);
  });

  it('returns an empty set for a leaf', () => {
    const spaces = [space('a', null, 'A'), space('b', 'a', 'B')];

    expect(collectDescendantIds('b', spaces).size).toBe(0);
  });
});