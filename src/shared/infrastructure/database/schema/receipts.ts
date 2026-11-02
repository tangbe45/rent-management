import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Finalized receipts. A receipt is immutable: the row is written once and never
 * edited or deleted by normal application flow. The snapshot is the JSON
 * representation of everything printed on the finalized PDF, and
 * `document_file_ref` points at the durable PDF file.
 */
export const receipts = sqliteTable(
  'receipts',
  {
    id: text('id').primaryKey(),
    receiptNumber: text('receipt_number').notNull(),
    paymentId: text('payment_id').notNull(),
    agreementId: text('agreement_id').notNull(),
    language: text('language').notNull(),
    snapshot: text('snapshot').notNull(),
    documentFileRef: text('document_file_ref').notNull(),
    documentSize: integer('document_size').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('receipts_receipt_number_idx').on(table.receiptNumber),
    uniqueIndex('receipts_payment_id_idx').on(table.paymentId),
    index('receipts_agreement_id_idx').on(table.agreementId),
    index('receipts_created_at_idx').on(table.createdAt),
  ],
);

/**
 * One lifetime permission counter (id is always 1) backing the sequential
 * `RCP-######` numbers. The value is incremented inside SQLite transactions so
 * an allocated number is never reused, even across crashes or retries.
 */
export const receiptNumberSequence = sqliteTable('receipt_number_sequence', {
  id: integer('id').primaryKey(),
  value: integer('value').notNull(),
});