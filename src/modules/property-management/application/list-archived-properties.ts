import type { Property } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';

/**
 * Lists archived properties only. Active and archived properties are never
 * mixed in a single list unless a future use case explicitly asks for it.
 */
export class ListArchivedProperties {
  constructor(private readonly deps: { properties: PropertyRepository }) {}

  execute(): Property[] {
    return this.deps.properties.findArchived();
  }
}