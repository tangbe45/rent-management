import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { properties } from './properties';

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
    /**
     * A space must belong to an existing property, and a referenced property
     * can never be physically deleted while spaces still belong to it.
     */
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [properties.id],
      name: 'property_spaces_property_id_fk',
    }).onDelete('restrict'),
    /**
     * Composite self-reference: the parent space must exist in the same
     * property. This keeps the cross-property invariant at the storage layer,
     * in addition to application-level validation, and forbids cascading
     * deletion of a parent that still has children.
     */
    foreignKey({
      columns: [table.parentSpaceId, table.propertyId],
      foreignColumns: [table.id, table.propertyId],
      name: 'property_spaces_parent_space_fk',
    }).onDelete('restrict'),
    /** Parent key required by the composite self-reference above. */
    uniqueIndex('property_spaces_id_property_id_unique').on(table.id, table.propertyId),
    /** A space can never be its own parent. */
    check(
      'property_spaces_not_self_parent',
      sql`${table.parentSpaceId} IS NULL OR ${table.parentSpaceId} <> ${table.id}`,
    ),
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