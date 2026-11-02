import { eq } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { properties } from '../../../shared/infrastructure/database/schema/properties';
import type { PropertyLookup, PropertyReference } from '../application/property-lookup';

export class DrizzlePropertyLookup implements PropertyLookup {
  constructor(private readonly db: Database) {}

  findById(id: string): PropertyReference | null {
    const row = this.db.select().from(properties).where(eq(properties.id, id)).get();
    if (row === undefined) {
      return null;
    }
    return { id: row.id, name: row.name, isActive: row.archivedAt === null };
  }
}
