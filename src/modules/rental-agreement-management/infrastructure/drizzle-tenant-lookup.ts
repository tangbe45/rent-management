import { eq } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import { tenants } from '../../../shared/infrastructure/database/schema/tenants';
import type { TenantLookup, TenantReference } from '../application/tenant-lookup';

export class DrizzleTenantLookup implements TenantLookup {
  constructor(private readonly db: Database) {}

  findById(id: string): TenantReference | null {
    const row = this.db.select().from(tenants).where(eq(tenants.id, id)).get();
    if (row === undefined) {
      return null;
    }
    return { id: row.id, fullName: row.fullName, isActive: row.archivedAt === null };
  }
}
