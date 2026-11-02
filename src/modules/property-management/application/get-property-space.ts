import type { PropertySpace } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';

export interface GetPropertySpaceInput {
  id: string;
}

/**
 * Retrieves a space by ID. Both active and archived spaces are retrievable.
 * Returns `null` when the space does not exist so presentation can render a
 * not-found state without treating it as an exception.
 */
export class GetPropertySpace {
  constructor(private readonly deps: { spaces: PropertySpaceRepository }) {}

  execute(input: GetPropertySpaceInput): PropertySpace | null {
    return this.deps.spaces.findById(input.id);
  }
}