import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Rental agreements. Monetary amounts are integer minor units (for example
 * cents); the MVP stores a single implicit currency and has no currency column.
 * Dates are date-only calendar strings (YYYY-MM-DD) and are never converted to
 * timezone-dependent timestamps. There is deliberately no stored status, no
 * space-availability flag, no `propertyId` (it is derived through the space) and
 * no payment/deposit-paid fields.
 */
export const rentalAgreements = sqliteTable(
  'rental_agreements',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    spaceId: text('space_id').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    terminationDate: text('termination_date'),
    rentAmount: integer('rent_amount').notNull(),
    rentFrequency: text('rent_frequency', {
      enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'],
    }).notNull(),
    firstRentDueDate: text('first_rent_due_date').notNull(),
    securityDepositAmount: integer('security_deposit_amount'),
    notes: text('notes'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('rental_agreements_tenant_id_idx').on(table.tenantId),
    index('rental_agreements_space_id_idx').on(table.spaceId),
    index('rental_agreements_start_date_idx').on(table.startDate),
  ],
);
