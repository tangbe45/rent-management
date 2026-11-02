import type { Clock } from '../../../shared/domain/clock';
import type { PropertySpace } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';
import {
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceNotFoundError,
} from './property-space-errors';

export interface UpdatePropertySpaceInput {
  id: string;
  name: string;
  type: string;
  rentable: boolean;
}

/**
 * Updates the editable, non-structural fields of a space (name, type, rentable).
 * Identity, property, parent and lifecycle state are preserved. The name must
 * remain unique among active siblings under the same parent.
 */
export class UpdatePropertySpace {
  constructor(
    private readonly deps: {
      spaces: PropertySpaceRepository;
      clock: Clock;
    },
  ) {}

  execute(input: UpdatePropertySpaceInput): PropertySpace {
    const space = this.deps.spaces.findById(input.id);
    if (space === null) {
      throw new PropertySpaceNotFoundError(input.id);
    }

    const updated = space.update({
      name: input.name,
      type: input.type,
      rentable: input.rentable,
      updatedAt: this.deps.clock.now(),
    });

    const sibling = this.deps.spaces.findActiveSiblingByName({
      propertyId: updated.propertyId,
      parentSpaceId: updated.parentSpaceId,
      name: updated.name,
    });
    if (sibling !== null && sibling.id !== updated.id) {
      throw new PropertySpaceNameAlreadyExistsError(updated.name);
    }

    this.deps.spaces.update(updated);
    return updated;
  }
}