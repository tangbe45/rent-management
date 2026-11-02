import { eq, sql } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import {
  receiptNumberSequence,
  receipts,
} from '../../../shared/infrastructure/database/schema/receipts';
import { InvalidReceiptNumberStateError } from '../application/errors';
import type { ReceiptNumberSequenceRepository, ReceiptRepository } from '../domain/receipt-repository';
import { Receipt } from '../domain/receipt';
import type { ReceiptData } from '../domain/receipt';
import {
  parseReceiptSnapshot,
  serializedReceiptSnapshot,
} from '../domain/receipt-snapshot';

export type ReceiptRow = typeof receipts.$inferSelect;

const SEQUENCE_ID = 1;

export function toReceiptRow(receipt: Receipt): ReceiptRow {
  const data = receipt.value;
  return {
    id: data.id,
    receiptNumber: data.receiptNumber,
    paymentId: data.paymentId,
    agreementId: data.agreementId,
    language: data.language,
    snapshot: serializedReceiptSnapshot(data.snapshot),
    documentFileRef: data.documentFileRef,
    documentSize: data.documentSize,
    createdAt: data.createdAt,
  };
}

export function toReceiptData(row: ReceiptRow): ReceiptData {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    paymentId: row.paymentId,
    agreementId: row.agreementId,
    language: row.language as 'en' | 'fr',
    snapshot: parseReceiptSnapshot(row.snapshot),
    documentFileRef: row.documentFileRef,
    documentSize: row.documentSize,
    createdAt: row.createdAt,
  };
}

/**
 * Drizzle-backed finalized receipts. Inserts only: there is deliberately no
 * delete or update path for a finalized receipt.
 */
export class DrizzleReceiptRepository implements ReceiptRepository {
  constructor(private readonly db: Database) {}

  save(receipt: Receipt): void {
    this.db.insert(receipts).values(toReceiptRow(receipt)).run();
  }

  findById(id: string): Receipt | null {
    const row = this.db.select().from(receipts).where(eq(receipts.id, id)).get();
    return row ? Receipt.hydrate(toReceiptData(row)) : null;
  }

  findByPaymentId(paymentId: string): Receipt | null {
    const row = this.db.select().from(receipts).where(eq(receipts.paymentId, paymentId)).get();
    return row ? Receipt.hydrate(toReceiptData(row)) : null;
  }

  findAll(): Receipt[] {
    return this.db.select().from(receipts).all().map((row) => Receipt.hydrate(toReceiptData(row)));
  }

  count(): number {
    const row = this.db
      .select({ total: sql<number>`count(*)` })
      .from(receipts)
      .get();
    return row?.total ?? 0;
  }
}

/**
 * Database-serialized lifetime counter. The increment happens inside a single
 * transaction (UPDATE then read back) and only ever moves forward, so the same
 * number can never be issued twice even across crashes or concurrent retries.
 * `onConflictDoNothing` seeds the row safely on first use.
 */
export class DrizzleReceiptNumberSequenceRepository implements ReceiptNumberSequenceRepository {
  constructor(private readonly db: Database) {}

  allocateNext(): number {
    return this.db.transaction((tx) => {
      const db = tx as unknown as Database;
      db.insert(receiptNumberSequence)
        .values({ id: SEQUENCE_ID, value: 0 })
        .onConflictDoNothing({ target: receiptNumberSequence.id })
        .run();
      db.update(receiptNumberSequence)
        .set({ value: sql`${receiptNumberSequence.value} + 1` })
        .where(eq(receiptNumberSequence.id, SEQUENCE_ID))
        .run();
      const row = db
        .select()
        .from(receiptNumberSequence)
        .where(eq(receiptNumberSequence.id, SEQUENCE_ID))
        .get();
      if (row === undefined) {
        throw new InvalidReceiptNumberStateError('receipt number sequence row is missing');
      }
      return row.value;
    });
  }
}