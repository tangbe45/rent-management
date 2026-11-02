import { eq } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { propertySpaces } from '../../../shared/infrastructure/database/schema/property-spaces';
import type { SpaceLookup, SpaceReference } from '../application/space-lookup';

interface PropertySpaceRow {
  id: string;
  propertyId: string;
  parentSpaceId: string | null;
  name: string;
  rentable: boolean;
  archivedAt: number | null;
}

function toSpaceReference(row: PropertySpaceRow): SpaceReference {
  return {
    id: row.id,
    propertyId: row.propertyId,
    parentSpaceId: row.parentSpaceId,
    name: row.name,
    rentable: row.rentable,
    isActive: row.archivedAt === null,
  };
}

export class DrizzleSpaceLookup implements SpaceLookup {
  constructor(private readonly db: Database) {}

  findById(id: string): SpaceReference | null {
    const row = this.db.select().from(propertySpaces).where(eq(propertySpaces.id, id)).get();
    return row === undefined ? null : toSpaceReference(row);
  }

  findAncestors(spaceId: string): SpaceReference[] {
    const ancestors: SpaceReference[] = [];
    const visited = new Set<string>([spaceId]);
    let current = this.findById(spaceId)?.parentSpaceId ?? null;
    while (current !== null && !visited.has(current)) {
      visited.add(current);
      const parent = this.findById(current);
      if (parent === null) {
        break;
      }
      ancestors.push(parent);
      current = parent.parentSpaceId;
    }
    return ancestors;
  }

  findDescendantIds(spaceId: string): string[] {
    const descendants: string[] = [];
    const visited = new Set<string>([spaceId]);
    const frontier = [spaceId];
    while (frontier.length > 0) {
      const current = frontier.pop() as string;
      const children = this.db
        .select()
        .from(propertySpaces)
        .where(eq(propertySpaces.parentSpaceId, current))
        .all();
      for (const child of children) {
        if (visited.has(child.id)) {
          continue;
        }
        visited.add(child.id);
        descendants.push(child.id);
        frontier.push(child.id);
      }
    }
    return descendants;
  }

  findByPropertyId(propertyId: string): SpaceReference[] {
    return this.db
      .select()
      .from(propertySpaces)
      .where(eq(propertySpaces.propertyId, propertyId))
      .orderBy(propertySpaces.createdAt)
      .all()
      .map((row) => toSpaceReference(row));
  }
}
