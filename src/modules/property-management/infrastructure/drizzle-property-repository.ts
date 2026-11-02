import { eq, isNotNull, isNull } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { properties } from '../../../shared/infrastructure/database/schema/properties';
import { Property, type PropertyData } from '../domain/property';
import type { PropertyRepository } from '../domain/property-repository';

/**
 * Structural shape of a persisted property row. Declaring it explicitly keeps
 * the Drizzle-specific row type out of the mapping helpers, which are pure and
 * unit-tested without a database.
 */
export interface PropertyRow {
  id: string;
  name: string;
  address: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export function toPropertyData(row: PropertyRow): PropertyData {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  };
}

export function toPropertyRow(property: Property): PropertyRow {
  return {
    id: property.id,
    name: property.name,
    address: property.address,
    description: property.description,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    archivedAt: property.archivedAt,
  };
}

export class DrizzlePropertyRepository implements PropertyRepository {
  constructor(private readonly db: Database) {}

  save(property: Property): void {
    this.db.insert(properties).values(toPropertyRow(property)).run();
  }

  update(property: Property): void {
    this.db
      .update(properties)
      .set({
        name: property.name,
        address: property.address,
        description: property.description,
        updatedAt: property.updatedAt,
        archivedAt: property.archivedAt,
      })
      .where(eq(properties.id, property.id))
      .run();
  }

  findById(id: string): Property | null {
    const row = this.db.select().from(properties).where(eq(properties.id, id)).get();
    return row ? Property.hydrate(toPropertyData(row)) : null;
  }

  findActive(): Property[] {
    return this.db
      .select()
      .from(properties)
      .where(isNull(properties.archivedAt))
      .orderBy(properties.createdAt)
      .all()
      .map((row) => Property.hydrate(toPropertyData(row)));
  }

  findArchived(): Property[] {
    return this.db
      .select()
      .from(properties)
      .where(isNotNull(properties.archivedAt))
      .orderBy(properties.archivedAt)
      .all()
      .map((row) => Property.hydrate(toPropertyData(row)));
  }
}