import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { Property } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';

export interface CreatePropertyInput {
  name: string;
  address: string;
  description?: string | null;
}

export class CreateProperty {
  constructor(
    private readonly deps: {
      properties: PropertyRepository;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: CreatePropertyInput): Property {
    const property = Property.create({
      id: this.deps.idGenerator.next(),
      name: input.name,
      address: input.address,
      description: input.description,
      createdAt: this.deps.clock.now(),
    });
    this.deps.properties.save(property);
    return property;
  }
}