import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Single-row landlord-receipt settings (id is always 1). Contact details and
 * optional logo/signature/stamp assets used when generating receipts. The
 * landlord display name itself stays on `accounts`.
 */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  landlordPhone: text('landlord_phone'),
  landlordEmail: text('landlord_email'),
  landlordAddress: text('landlord_address'),
  logoFileName: text('logo_file_name'),
  signatureFileName: text('signature_file_name'),
  signatureMode: text('signature_mode').notNull(),
  stampFileName: text('stamp_file_name'),
  stampMode: text('stamp_mode').notNull(),
  updatedAt: integer('updated_at').notNull(),
});