import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tenants = sqliteTable(
  'tenants',
  {
    id: text('id').primaryKey(),
    fullName: text('full_name').notNull(),
    phone: text('phone'),
    secondPhoneNumber: text('second_phone_number'),
    email: text('email'),
    nationalIdCardNumber: text('national_id_card_number'),
    notes: text('notes'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    archivedAt: integer('archived_at'),
  },
  (table) => [
    index('tenants_full_name_idx').on(table.fullName),
    index('tenants_archived_at_idx').on(table.archivedAt),
  ],
);
