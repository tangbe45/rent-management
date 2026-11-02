import type { PropertySpace } from './property-space';

export interface PropertySpaceSiblingLookup {
  propertyId: string;
  parentSpaceId: string | null;
  name: string;
}

/**
 * Persistence boundary for property spaces. It exposes only domain types — no
 * Drizzle rows or SQLite connections leak into the domain or application layers.
 * `save` inserts a new space; `update` rewrites an existing one by its stable
 * id. Sibling lookups are always scoped to active spaces under the same parent
 * of the same property.
 */
export interface PropertySpaceRepository {
  save(space: PropertySpace): void;
  update(space: PropertySpace): void;
  findById(id: string): PropertySpace | null;
  findByPropertyId(propertyId: string): PropertySpace[];
  findActiveSiblingByName(input: PropertySpaceSiblingLookup): PropertySpace | null;
}