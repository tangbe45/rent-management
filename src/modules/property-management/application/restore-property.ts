import type { Clock } from '../../../shared/domain/clock';
import type { Property } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';
import { PropertyNotFoundError } from './errors';

export interface RestorePropertyInput {
  id: string;
}

/**
 * Restores an archived property by clearing `archivedAt`. The id, `createdAt`
 * and historical identity are preserved and no new record is created.
 */
export class RestoreProperty {
  constructor(
    private readonly deps: {
      properties: PropertyRepository;
      clock: Clock;
    },
  ) {}

  execute(input: RestorePropertyInput): Property {
    const property = this.deps.properties.findById(input.id);
    if (property === null) {
      throw new PropertyNotFoundError(input.id);
    }
    const restored = property.restore(this.deps.clock.now());
    this.deps.properties.update(restored);
    return restored;
  }
}