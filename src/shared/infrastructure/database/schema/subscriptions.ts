import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['TRIAL', 'PAID'] }).notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  createdAt: integer('created_at').notNull(),
});