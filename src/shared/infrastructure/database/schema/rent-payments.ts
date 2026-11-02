import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Persisted rent obligations (installments). Money is stored as integer minor
 * units and dates as date-only calendar strings (YYYY-MM-DD). The amount and due
 * date are immutable snapshots of the schedule at the time the obligation was
 * materialized. The unique (agreement, due date) index is the final guard against
 * duplicate installments from repeated lazy generation.
 */
export const rentInstallments = sqliteTable(
  'rent_installments',
  {
    id: text('id').primaryKey(),
    agreementId: text('agreement_id').notNull(),
    dueDate: text('due_date').notNull(),
    periodIndex: integer('period_index').notNull(),
    amount: integer('amount').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('rent_installments_agreement_due_date_idx').on(table.agreementId, table.dueDate),
    index('rent_installments_agreement_id_idx').on(table.agreementId),
  ],
);

/**
 * Money actually received from a tenant for one rental agreement. Immutable:
 * corrections are recorded as a separate reversal, never by editing or deleting.
 * The MVP stores a single implicit currency and has no currency column.
 */
export const rentPayments = sqliteTable(
  'rent_payments',
  {
    id: text('id').primaryKey(),
    agreementId: text('agreement_id').notNull(),
    amount: integer('amount').notNull(),
    paymentDate: text('payment_date').notNull(),
    method: text('method', {
      enum: ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'],
    }).notNull(),
    reference: text('reference'),
    notes: text('notes'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('rent_payments_agreement_id_idx').on(table.agreementId),
    index('rent_payments_payment_date_idx').on(table.paymentDate),
  ],
);

/**
 * A payment applied across one or more installments of the same agreement.
 * `installment_due_date` snapshots the scheduled period so payment history stays
 * readable even if the installment is later discarded during a pre-start term
 * change.
 */
export const rentPaymentAllocations = sqliteTable(
  'rent_payment_allocations',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id').notNull(),
    installmentId: text('installment_id').notNull(),
    installmentDueDate: text('installment_due_date').notNull(),
    amount: integer('amount').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('rent_payment_allocations_payment_id_idx').on(table.paymentId),
    index('rent_payment_allocations_installment_id_idx').on(table.installmentId),
  ],
);

/**
 * A separate immutable fact that neutralizes a payment's accounting effect. At
 * most one reversal exists per payment, keyed by the payment id.
 */
export const rentPaymentReversals = sqliteTable('rent_payment_reversals', {
  paymentId: text('payment_id').primaryKey(),
  reason: text('reason', {
    enum: ['WRONG_AMOUNT', 'WRONG_RENT', 'DUPLICATE', 'OTHER'],
  }).notNull(),
  explanation: text('explanation'),
  reversedAt: integer('reversed_at').notNull(),
});
