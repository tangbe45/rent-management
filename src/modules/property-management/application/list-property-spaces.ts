import type { PropertySpace } from '../domain/property-space';
import type { PropertySpaceRepository } from '../domain/property-space-repository';

export interface ListPropertySpacesInput {
  propertyId: string;
}

/**
 * Lists every space of a property — active and archived — so presentation can
 * render the full hierarchy and still distinguish archived spaces. Spaces are
 * returned unordered; the tree is assembled in the presentation layer.
 */
export class ListPropertySpaces {
  constructor(private readonly deps: { spaces: PropertySpaceRepository }) {}

  execute(input: ListPropertySpacesInput): PropertySpace[] {
    return this.deps.spaces.findByPropertyId(input.propertyId);
  }
}