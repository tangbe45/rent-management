import type { Clock } from '../../../shared/domain/clock';
import type { Property } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';
import { PropertyNotFoundError } from './errors';

export interface UpdatePropertyInput {
  id: string;
  name: string;
  address: string;
  description?: string | null;
}

/**
 * Updates the editable property information (name, address, description).
 * Identity and lifecycle state are preserved — editing never archives or
 * restores a property.
 */
export class UpdateProperty {
  constructor(
    private readonly deps: {
      properties: PropertyRepository;
      clock: Clock;
    },
  ) {}

  execute(input: UpdatePropertyInput): Property {
    const property = this.deps.properties.findById(input.id);
    if (property === null) {
      throw new PropertyNotFoundError(input.id);
    }

    const updated = property.update({
      name: input.name,
      address: input.address,
      description: input.description,
      updatedAt: this.deps.clock.now(),
    });
    this.deps.properties.update(updated);
    return updated;
  }
}