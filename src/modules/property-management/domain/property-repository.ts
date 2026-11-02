import type { Property } from './property';

/**
 * Persistence boundary for properties. It exposes only domain types — no
 * Drizzle rows, SQL builders or SQLite connections leak into the domain or
 * application layers. `save` inserts a new property; `update` rewrites an
 * existing one (matched by its stable id).
 */
export interface PropertyRepository {
  save(property: Property): void;
  update(property: Property): void;
  findById(id: string): Property | null;
  findActive(): Property[];
  findArchived(): Property[];
}