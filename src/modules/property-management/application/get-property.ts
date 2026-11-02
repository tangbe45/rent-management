import type { Property } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';

export interface GetPropertyInput {
  id: string;
}

/**
 * Retrieves a property by ID. Both active and archived properties are
 * retrievable. Returns `null` when the property does not exist so presentation
 * can render a not-found state without treating it as an exception.
 */
export class GetProperty {
  constructor(private readonly deps: { properties: PropertyRepository }) {}

  execute(input: GetPropertyInput): Property | null {
    return this.deps.properties.findById(input.id);
  }
}