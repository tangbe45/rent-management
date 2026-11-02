/**
 * Minimal read model of a Property Space, including the hierarchy lookups
 * needed to validate placement, detect hierarchy conflicts and protect the right
 * spaces from archiving. The Rental Agreement domain never imports the Property
 * Space domain.
 */
export interface SpaceReference {
  id: string;
  propertyId: string;
  parentSpaceId: string | null;
  name: string;
  rentable: boolean;
  isActive: boolean;
}

export interface SpaceLookup {
  findById(id: string): SpaceReference | null;
  /** Ancestors from the immediate parent up to the root, root last. */
  findAncestors(spaceId: string): SpaceReference[];
  /** All descendants of the space, at any depth. */
  findDescendantIds(spaceId: string): string[];
  findByPropertyId(propertyId: string): SpaceReference[];
}
