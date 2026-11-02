import { InvalidReceiptError } from './errors';
import { isReceiptNumber } from './receipt-number';
import type { ReceiptSnapshotData } from './receipt-snapshot';

const DOCUMENT_FILE_REF_PATTERN = /^receipts\/[a-zA-Z0-9._-]+\.pdf$/;

export interface ReceiptData {
  id: string;
  receiptNumber: string;
  paymentId: string;
  agreementId: string;
  language: 'en' | 'fr';
  snapshot: ReceiptSnapshotData;
  documentFileRef: string;
  documentSize: number;
  createdAt: number;
}

export type CreateReceiptInput = ReceiptData;

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidReceiptError(field);
  }
}

function validate(data: ReceiptData, documentRequired: boolean): void {
  assertNonEmpty(data.id, 'id');
  if (!isReceiptNumber(data.receiptNumber)) {
    throw new InvalidReceiptError('receiptNumber');
  }
  assertNonEmpty(data.paymentId, 'paymentId');
  assertNonEmpty(data.agreementId, 'agreementId');
  if (data.language !== 'en' && data.language !== 'fr') {
    throw new InvalidReceiptError('language');
  }
  if (!DOCUMENT_FILE_REF_PATTERN.test(data.documentFileRef)) {
    throw new InvalidReceiptError('documentFileRef');
  }
  const minimumSize = documentRequired ? 1 : 0;
  if (!Number.isSafeInteger(data.documentSize) || data.documentSize < minimumSize) {
    throw new InvalidReceiptError('documentSize');
  }
  if (!Number.isSafeInteger(data.createdAt) || data.createdAt < 0) {
    throw new InvalidReceiptError('createdAt');
  }
  if (data.snapshot.receiptNumber !== data.receiptNumber || data.snapshot.language !== data.language) {
    throw new InvalidReceiptError('snapshotMismatch');
  }
}

/**
 * A finalized receipt. Immutable by construction: there is no operation that
 * edits or deletes it. `create` requires a persisted document; `hydrate` only
 * validates a stored row (a zero document size marks a corrupt missing file).
 */
export class Receipt {
  private constructor(private readonly data: ReceiptData) {}

  static create(input: CreateReceiptInput): Receipt {
    validate(input, true);
    return new Receipt({ ...input });
  }

  static hydrate(data: ReceiptData): Receipt {
    validate(data, false);
    return new Receipt({ ...data });
  }

  get value(): ReceiptData {
    return { ...this.data };
  }

  get id(): string {
    return this.data.id;
  }

  get receiptNumber(): string {
    return this.data.receiptNumber;
  }

  get paymentId(): string {
    return this.data.paymentId;
  }

  get agreementId(): string {
    return this.data.agreementId;
  }

  get language(): 'en' | 'fr' {
    return this.data.language;
  }

  get snapshot(): ReceiptSnapshotData {
    return this.data.snapshot;
  }

  get documentFileRef(): string {
    return this.data.documentFileRef;
  }

  get documentSize(): number {
    return this.data.documentSize;
  }

  get createdAt(): number {
    return this.data.createdAt;
  }
}