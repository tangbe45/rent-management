import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const propertySpaces = sqliteTable(
  'property_spaces',
  {
    id: text('id').primaryKey(),
    propertyId: text('property_id').notNull(),
    parentSpaceId: text('parent_space_id'),
    name: text('name').notNull(),
    type: text('type', {
      enum: [
        'BUILDING',
        'FLOOR',
        'APARTMENT',
        'STUDIO',
        'ROOM',
        'SHOP',
        'OFFICE',
        'WAREHOUSE',
        'OTHER',
      ],
    }).notNull(),
    rentable: integer('rentable', { mode: 'boolean' }).notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    archivedAt: integer('archived_at'),
  },
  (table) => [
    index('property_spaces_property_id_idx').on(table.propertyId),
    index('property_spaces_parent_space_id_idx').on(table.parentSpaceId),
    index('property_spaces_archived_at_idx').on(table.archivedAt),
    uniqueIndex('property_spaces_active_parented_name_idx')
      .on(table.propertyId, table.parentSpaceId, table.name)
      .where(sql`parent_space_id IS NOT NULL AND archived_at IS NULL`),
    uniqueIndex('property_spaces_active_root_name_idx')
      .on(table.propertyId, table.name)
      .where(sql`parent_space_id IS NULL AND archived_at IS NULL`),
  ],
);