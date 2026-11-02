import type { Receipt } from './receipt';

export interface ReceiptRepository {
  save(receipt: Receipt): void;
  findById(id: string): Receipt | null;
  findByPaymentId(paymentId: string): Receipt | null;
  findAll(): Receipt[];
  count(): number;
}

/**
 * Datastore-safe lifetime counter for receipt numbers. Allocation runs inside a
 * SQLite transaction and only ever moves forward, so a number is never reused
 * even if a later step fails.
 */
export interface ReceiptNumberSequenceRepository {
  allocateNext(): number;
}