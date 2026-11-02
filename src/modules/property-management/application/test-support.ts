import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { Property } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';
import type { ActiveRentalAgreementsQuery } from './active-rental-agreements-query';

export class InMemoryPropertyRepository implements PropertyRepository {
  private readonly rows = new Map<string, Property>();

  save(property: Property): void {
    this.rows.set(property.id, property);
  }

  update(property: Property): void {
    this.rows.set(property.id, property);
  }

  findById(id: string): Property | null {
    return this.rows.get(id) ?? null;
  }

  findActive(): Property[] {
    return [...this.rows.values()].filter((property) => property.isActive);
  }

  findArchived(): Property[] {
    return [...this.rows.values()].filter((property) => property.isArchived);
  }

  get all(): Property[] {
    return [...this.rows.values()];
  }
}

export class FakeClock implements Clock {
  constructor(private value: number = 1000) {}

  today(): CalendarDateString {
    return '2026-10-08';
  }

  now(): number {
    return this.value;
  }

  set(value: number): void {
    this.value = value;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly prefix: string = 'id') {}

  next(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}

export class StubActiveRentalAgreementsQuery implements ActiveRentalAgreementsQuery {
  constructor(private readonly blockedPropertyIds: ReadonlySet<string> = new Set()) {}

  hasActiveForProperty(propertyId: string): boolean {
    return this.blockedPropertyIds.has(propertyId);
  }
}

export function activeProperty(id: string, createdAt: number = 1): Property {
  return Property.create({
    id,
    name: `Property ${id}`,
    address: `Address ${id}`,
    createdAt,
  });
}

export function archivedProperty(id: string, archivedAt: number = 2): Property {
  return activeProperty(id).archive(archivedAt);
}