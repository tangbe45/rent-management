import type { PropertySpace } from '../domain/property-space';

export interface FlatSpaceNode {
  space: PropertySpace;
  depth: number;
  /** Number of direct children present in the same list. */
  childCount: number;
}

function groupByParent(spaces: readonly PropertySpace[]): Map<string | null, PropertySpace[]> {
  const ids = new Set(spaces.map((space) => space.id));
  const grouped = new Map<string | null, PropertySpace[]>();
  for (const space of spaces) {
    // A space whose parent is absent from the list is treated as a root so the
    // tree can never lose a node, even if data is temporarily inconsistent.
    const parentKey =
      space.parentSpaceId !== null && ids.has(space.parentSpaceId) ? space.parentSpaceId : null;
    const siblings = grouped.get(parentKey) ?? [];
    siblings.push(space);
    grouped.set(parentKey, siblings);
  }
  for (const siblings of grouped.values()) {
    siblings.sort((left, right) => left.name.localeCompare(right.name));
  }
  return grouped;
}

/**
 * Flattens the space hierarchy into a depth-annotated list, parents immediately
 * followed by their descendants (depth-first), so the UI can render a readable
 * tree with indentation and without recursion in the component.
 */
export function flattenSpaceTree(spaces: readonly PropertySpace[]): FlatSpaceNode[] {
  const grouped = groupByParent(spaces);
  const result: FlatSpaceNode[] = [];
  const visit = (parentKey: string | null, depth: number): void => {
    for (const space of grouped.get(parentKey) ?? []) {
      result.push({ space, depth, childCount: (grouped.get(space.id) ?? []).length });
      visit(space.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/**
 * Keeps only the nodes that should be visible for a given expansion state. The
 * flattened list is depth-first, so once a parent is collapsed every following
 * node deeper than that parent belongs to its subtree and is skipped until the
 * next node at the same or shallower depth. Roots are always visible.
 */
export function visibleSpaceRows(
  nodes: readonly FlatSpaceNode[],
  isExpanded: (id: string) => boolean,
): FlatSpaceNode[] {
  const visible: FlatSpaceNode[] = [];
  let collapsedDepth: number | null = null;
  for (const node of nodes) {
    if (collapsedDepth !== null) {
      if (node.depth > collapsedDepth) {
        continue;
      }
      collapsedDepth = null;
    }
    visible.push(node);
    if (node.childCount > 0 && !isExpanded(node.space.id)) {
      collapsedDepth = node.depth;
    }
  }
  return visible;
}

/**
 * Collects the ids of every descendant of `spaceId`. Used by the form to keep a
 * space (and its whole subtree) out of its own parent options, preventing cycles
 * before the use case would reject them.
 */
export function collectDescendantIds(
  spaceId: string,
  spaces: readonly PropertySpace[],
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const space of spaces) {
    if (space.parentSpaceId === null) {
      continue;
    }
    const children = childrenOf.get(space.parentSpaceId) ?? [];
    children.push(space.id);
    childrenOf.set(space.parentSpaceId, children);
  }

  const descendants = new Set<string>();
  const stack = [spaceId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const childId of childrenOf.get(current) ?? []) {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        stack.push(childId);
      }
    }
  }
  return descendants;
}