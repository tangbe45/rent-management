import type { Clock } from '../../../shared/domain/clock';
import type { PropertySpace } from '../domain/property-space';
import { PropertySpaceAlreadyActiveError } from '../domain/property-space';
import type { PropertyRepository } from '../domain/property-repository';
import type { PropertySpaceRepository } from '../domain/property-space-repository';
import { PropertyNotFoundError } from './errors';
import {
  PropertyArchivedError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceNotFoundError,
  PropertySpaceParentArchivedError,
} from './property-space-errors';

export interface RestorePropertySpaceInput {
  id: string;
}

/**
 * Restores an archived space: the same identity is returned and `archivedAt` is
 * cleared. The owning property must be active, and if the space has a parent the
 * parent must still be active. Descendants are never restored or archived
 * automatically, and `rentable` is never changed by archive/restore.
 */
export class RestorePropertySpace {
  constructor(
    private readonly deps: {
      spaces: PropertySpaceRepository;
      properties: PropertyRepository;
      clock: Clock;
    },
  ) {}

  execute(input: RestorePropertySpaceInput): PropertySpace {
    const space = this.deps.spaces.findById(input.id);
    if (space === null) {
      throw new PropertySpaceNotFoundError(input.id);
    }
    if (space.isActive) {
      throw new PropertySpaceAlreadyActiveError(space.id);
    }

    const property = this.deps.properties.findById(space.propertyId);
    if (property === null) {
      throw new PropertyNotFoundError(space.propertyId);
    }
    if (property.isArchived) {
      throw new PropertyArchivedError(property.id);
    }

    if (space.parentSpaceId !== null) {
      const parent = this.deps.spaces.findById(space.parentSpaceId);
      if (parent === null) {
        throw new PropertySpaceNotFoundError(space.parentSpaceId);
      }
      if (parent.isArchived) {
        throw new PropertySpaceParentArchivedError(parent.id);
      }
    }

    const sibling = this.deps.spaces.findActiveSiblingByName({
      propertyId: space.propertyId,
      parentSpaceId: space.parentSpaceId,
      name: space.name,
    });
    if (sibling !== null && sibling.id !== space.id) {
      throw new PropertySpaceNameAlreadyExistsError(space.name);
    }

    const restored = space.restore(this.deps.clock.now());
    this.deps.spaces.update(restored);
    return restored;
  }
}