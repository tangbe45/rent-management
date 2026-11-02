import { CreateProperty } from './create-property';
import {
  FakeClock,
  InMemoryPropertyRepository,
  SequentialIdGenerator,
} from './test-support';

function build() {
  const properties = new InMemoryPropertyRepository();
  const clock = new FakeClock(5000);
  const createProperty = new CreateProperty({
    properties,
    clock,
    idGenerator: new SequentialIdGenerator('prop'),
  });
  return { properties, clock, createProperty };
}

describe('CreateProperty', () => {
  it('creates, timestamps and persists a property', () => {
    const { properties, createProperty } = build();

    const property = createProperty.execute({
      name: '  Green Valley Estate  ',
      address: '  12 Main Street  ',
      description: '  Near the market  ',
    });

    expect(property.id).toBe('prop-1');
    expect(property.name).toBe('Green Valley Estate');
    expect(property.address).toBe('12 Main Street');
    expect(property.description).toBe('Near the market');
    expect(property.createdAt).toBe(5000);
    expect(properties.findById('prop-1')).toBe(property);
  });

  it('accepts a missing description', () => {
    const { createProperty } = build();
    const property = createProperty.execute({ name: 'Family House', address: '5 Oak Avenue' });
    expect(property.description).toBeNull();
  });

  it('propagates domain validation for a blank name', () => {
    const { createProperty } = build();
    expect(() => createProperty.execute({ name: '   ', address: '5 Oak Avenue' })).toThrow(
      /name is required/,
    );
  });
});