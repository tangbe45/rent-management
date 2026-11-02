import type { Property } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';

/**
 * Lists active properties only. Archived properties are intentionally excluded
 * and have a separate retrieval path (`ListArchivedProperties`).
 */
export class ListProperties {
  constructor(private readonly deps: { properties: PropertyRepository }) {}

  execute(): Property[] {
    return this.deps.properties.findActive();
  }
}