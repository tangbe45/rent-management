import type { Clock } from '../../../shared/domain/clock';
import type { PropertySpace } from '../domain/property-space';
import { InvalidPropertySpaceParentError } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';
import {
  PropertySpaceCycleError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceNotFoundError,
  PropertySpaceParentArchivedError,
  PropertySpaceParentMismatchError,
} from './property-space-errors';

export interface MovePropertySpaceInput {
  id: string;
  parentSpaceId: string | null;
}

/**
 * Moves an active space to another parent (or to the root with `null`). The
 * destination parent must exist, be active and belong to the same property. The
 * move must not create a cycle, and the name must remain unique among the active
 * siblings of the destination parent. A space can never move across properties.
 */
export class MovePropertySpace {
  constructor(
    private readonly deps: {
      spaces: PropertySpaceRepository;
      clock: Clock;
    },
  ) {}

  execute(input: MovePropertySpaceInput): PropertySpace {
    const space = this.deps.spaces.findById(input.id);
    if (space === null) {
      throw new PropertySpaceNotFoundError(input.id);
    }

    const parentSpaceId = input.parentSpaceId ?? null;
    if (parentSpaceId !== null) {
      if (parentSpaceId === space.id) {
        throw new InvalidPropertySpaceParentError('A space cannot be its own parent.');
      }
      const parent = this.deps.spaces.findById(parentSpaceId);
      if (parent === null) {
        throw new PropertySpaceNotFoundError(parentSpaceId);
      }
      if (parent.isArchived) {
        throw new PropertySpaceParentArchivedError(parent.id);
      }
      if (parent.propertyId !== space.propertyId) {
        throw new PropertySpaceParentMismatchError(parent.id, space.propertyId);
      }
      this.assertNoCycle(space.id, parent.id);
    }

    const moved = space.moveTo(parentSpaceId, this.deps.clock.now());

    const sibling = this.deps.spaces.findActiveSiblingByName({
      propertyId: moved.propertyId,
      parentSpaceId: moved.parentSpaceId,
      name: moved.name,
    });
    if (sibling !== null && sibling.id !== moved.id) {
      throw new PropertySpaceNameAlreadyExistsError(moved.name);
    }

    this.deps.spaces.update(moved);
    return moved;
  }

  private assertNoCycle(spaceId: string, parentSpaceId: string): void {
    const visited = new Set<string>();
    let current: string | null = parentSpaceId;
    while (current !== null) {
      if (current === spaceId) {
        throw new PropertySpaceCycleError(spaceId);
      }
      if (visited.has(current)) {
        return;
      }
      visited.add(current);
      current = this.deps.spaces.findById(current)?.parentSpaceId ?? null;
    }
  }
}