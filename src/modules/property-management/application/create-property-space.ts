import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import type { PropertyRepository } from '../domain/property-repository';
import { PropertySpace } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';
import { PropertyNotFoundError } from './errors';
import {
  PropertyArchivedError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceNotFoundError,
  PropertySpaceParentArchivedError,
  PropertySpaceParentMismatchError,
} from './property-space-errors';

export interface CreatePropertySpaceInput {
  propertyId: string;
  parentSpaceId?: string | null;
  name: string;
  type: string;
  rentable: boolean;
}

/**
 * Creates a space inside an active property. A parent is optional (root space);
 * when supplied it must exist, be active and belong to the same property. The
 * name must be unique among the active siblings under the same parent — a
 * rentable parent may still receive children.
 */
export class CreatePropertySpace {
  constructor(
    private readonly deps: {
      spaces: PropertySpaceRepository;
      properties: PropertyRepository;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: CreatePropertySpaceInput): PropertySpace {
    const property = this.deps.properties.findById(input.propertyId);
    if (property === null) {
      throw new PropertyNotFoundError(input.propertyId);
    }
    if (property.isArchived) {
      throw new PropertyArchivedError(property.id);
    }

    const parentSpaceId = input.parentSpaceId ?? null;
    if (parentSpaceId !== null) {
      const parent = this.deps.spaces.findById(parentSpaceId);
      if (parent === null) {
        throw new PropertySpaceNotFoundError(parentSpaceId);
      }
      if (parent.isArchived) {
        throw new PropertySpaceParentArchivedError(parent.id);
      }
      if (parent.propertyId !== property.id) {
        throw new PropertySpaceParentMismatchError(parent.id, property.id);
      }
    }

    const space = PropertySpace.create({
      id: this.deps.idGenerator.next(),
      propertyId: property.id,
      parentSpaceId,
      name: input.name,
      type: input.type,
      rentable: input.rentable,
      createdAt: this.deps.clock.now(),
    });

    const sibling = this.deps.spaces.findActiveSiblingByName({
      propertyId: space.propertyId,
      parentSpaceId: space.parentSpaceId,
      name: space.name,
    });
    if (sibling !== null) {
      throw new PropertySpaceNameAlreadyExistsError(space.name);
    }

    this.deps.spaces.save(space);
    return space;
  }
}