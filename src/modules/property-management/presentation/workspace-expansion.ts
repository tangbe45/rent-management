/**
 * Presentation-only hint used to keep the workspace tree in sync with
 * navigation. When a child space is created (or a space is moved) elsewhere,
 * the form records the parent that should be expanded. The workspace consumes
 * the hint the next time it regains focus and expands that parent so the new
 * child is visible. No state is persisted; it only bridges two screens.
 */
const pending = new Map<string, Set<string>>();

export function requestExpandOnNextWorkspaceFocus(propertyId: string, spaceId: string): void {
  const ids = pending.get(propertyId) ?? new Set<string>();
  ids.add(spaceId);
  pending.set(propertyId, ids);
}

export function consumePendingExpansions(propertyId: string): readonly string[] {
  const ids = pending.get(propertyId);
  if (ids === undefined) {
    return [];
  }
  pending.delete(propertyId);
  return [...ids];
}
