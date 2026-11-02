import { and, eq, isNull } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { propertySpaces } from '../../../shared/infrastructure/database/schema/property-spaces';
import { PropertySpaceNameAlreadyExistsError } from '../application/property-space-errors';
import {
  PropertySpace,
  type PropertySpaceData,
  type PropertySpaceType,
} from '../domain/property-space';
import type {
  PropertySpaceRepository,
  PropertySpaceSiblingLookup,
} from '../domain/property-space-repository';

/**
 * Structural shape of a persisted property-space row. Declaring it explicitly
 * keeps the Drizzle-specific row type out of the mapping helpers, which are pure
 * and unit-tested without a database.
 */
export interface PropertySpaceRow {
  id: string;
  propertyId: string;
  parentSpaceId: string | null;
  name: string;
  type: PropertySpaceType;
  rentable: boolean;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export function toPropertySpaceData(row: PropertySpaceRow): PropertySpaceData {
  return {
    id: row.id,
    propertyId: row.propertyId,
    parentSpaceId: row.parentSpaceId,
    name: row.name,
    type: row.type,
    rentable: row.rentable,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  };
}

export function toPropertySpaceRow(space: PropertySpace): PropertySpaceRow {
  return {
    id: space.id,
    propertyId: space.propertyId,
    parentSpaceId: space.parentSpaceId,
    name: space.name,
    type: space.type,
    rentable: space.rentable,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
    archivedAt: space.archivedAt,
  };
}

export class DrizzlePropertySpaceRepository implements PropertySpaceRepository {
  constructor(private readonly db: Database) {}

  save(space: PropertySpace): void {
    try {
      this.db.insert(propertySpaces).values(toPropertySpaceRow(space)).run();
    } catch (error) {
      this.throwOnNameConflict(error, space.name);
    }
  }

  update(space: PropertySpace): void {
    try {
      this.db
        .update(propertySpaces)
        .set({
          parentSpaceId: space.parentSpaceId,
          name: space.name,
          type: space.type,
          rentable: space.rentable,
          updatedAt: space.updatedAt,
          archivedAt: space.archivedAt,
        })
        .where(eq(propertySpaces.id, space.id))
        .run();
    } catch (error) {
      this.throwOnNameConflict(error, space.name);
    }
  }

  private throwOnNameConflict(error: unknown, name: string): never {
    const message = error instanceof Error ? error.message : '';
    const isSiblingNameConflict =
      message.includes('UNIQUE constraint failed') &&
      message.includes('property_spaces.property_id') &&
      message.includes('property_spaces.name');
    if (isSiblingNameConflict) {
      throw new PropertySpaceNameAlreadyExistsError(name);
    }
    throw error;
  }

  findById(id: string): PropertySpace | null {
    const row = this.db.select().from(propertySpaces).where(eq(propertySpaces.id, id)).get();
    return row ? PropertySpace.hydrate(toPropertySpaceData(row)) : null;
  }

  findByPropertyId(propertyId: string): PropertySpace[] {
    return this.db
      .select()
      .from(propertySpaces)
      .where(eq(propertySpaces.propertyId, propertyId))
      .orderBy(propertySpaces.createdAt)
      .all()
      .map((row) => PropertySpace.hydrate(toPropertySpaceData(row)));
  }

  findActiveSiblingByName(input: PropertySpaceSiblingLookup): PropertySpace | null {
    const parentCondition =
      input.parentSpaceId === null
        ? isNull(propertySpaces.parentSpaceId)
        : eq(propertySpaces.parentSpaceId, input.parentSpaceId);
    const row = this.db
      .select()
      .from(propertySpaces)
      .where(
        and(
          eq(propertySpaces.propertyId, input.propertyId),
          parentCondition,
          eq(propertySpaces.name, input.name),
          isNull(propertySpaces.archivedAt),
        ),
      )
      .get();
    return row ? PropertySpace.hydrate(toPropertySpaceData(row)) : null;
  }
}