import type { PropertySpace } from '../domain/property-space';

export interface WorkspaceSummary {
  /** Active spaces (archived spaces are excluded). */
  activeSpaces: number;
  /** Active spaces whose `rentable` role is enabled — not a rental availability. */
  rentableSpaces: number;
  /** Active roots: no parent, or a parent that is itself not active in the tree. */
  topLevelSpaces: number;
}

/**
 * Derives the workspace summary from persisted spaces only. Counters are never
 * stored; `rentable` describes the role a space plays, never its current
 * availability (Rental Agreements are not implemented yet). Because archived
 * spaces are hidden from the active tree, an active space whose parent is
 * archived is displayed as a root and counted as top level, keeping the summary
 * consistent with what the tree shows.
 */
export function summarizeActiveSpaces(spaces: readonly PropertySpace[]): WorkspaceSummary {
  const active = spaces.filter((space) => space.isActive);
  const activeIds = new Set(active.map((space) => space.id));
  return {
    activeSpaces: active.length,
    rentableSpaces: active.filter((space) => space.rentable).length,
    topLevelSpaces: active.filter(
      (space) => space.parentSpaceId === null || !activeIds.has(space.parentSpaceId),
    ).length,
  };
}
