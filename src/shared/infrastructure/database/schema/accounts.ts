import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  createdAt: integer('created_at').notNull(),
});