import { InvalidReceiptError } from './errors';
import { Receipt } from './receipt';
import type { ReceiptData } from './receipt';
import type { ReceiptSnapshotData } from './receipt-snapshot';

const snapshot: ReceiptSnapshotData = {
  version: 1,
  language: 'en',
  receiptNumber: 'RCP-000001',
  generatedAt: 1000,
  landlord: { fullName: 'Landlord', phone: null, email: null, address: null },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
  tenant: { fullName: 'Tenant', phone: null },
  payment: {
    paymentDate: '2026-01-05',
    method: 'CASH',
    reference: null,
    amount: 25_000,
  },
  allocations: [{ installmentDueDate: '2026-01-01', amount: 25_000 }],
  appearance: {
    logoIncluded: false,
    signatureMode: 'MANUAL',
    signatureIncluded: false,
    stampMode: 'MANUAL',
    stampIncluded: false,
    omittedAssets: [],
  },
};

const base: ReceiptData = {
  id: 'receipt-1',
  receiptNumber: 'RCP-000001',
  paymentId: 'payment-1',
  agreementId: 'agreement-1',
  language: 'en',
  snapshot,
  documentFileRef: 'receipts/receipt-1.pdf',
  documentSize: 1234,
  createdAt: 1000,
};

describe('Receipt', () => {
  it('create requires a persisted document', () => {
    expect(() => Receipt.create({ ...base, documentSize: 0 })).toThrow(InvalidReceiptError);
    expect(() => Receipt.create({ ...base, documentFileRef: 'cache/x.pdf' })).toThrow(
      InvalidReceiptError,
    );
  });

  it('hydrate accepts a stored row whose document is missing (size zero)', () => {
    const receipt = Receipt.hydrate({ ...base, documentSize: 0 });
    expect(receipt.documentSize).toBe(0);
  });

  it('rejects a snapshot that disagrees with its row fields', () => {
    expect(() => Receipt.hydrate({ ...base, snapshot: { ...snapshot, receiptNumber: 'RCP-000002' } })).toThrow(
      InvalidReceiptError,
    );
    expect(() => Receipt.hydrate({ ...base, snapshot: { ...snapshot, language: 'fr' } })).toThrow(
      InvalidReceiptError,
    );
  });

  it('rejects any non-pdf document reference', () => {
    expect(() => Receipt.hydrate({ ...base, documentFileRef: 'receipts/receipt-1.pdf' })).not.toThrow();
    expect(() => Receipt.hydrate({ ...base, documentFileRef: 'receipts/receipt-1.png' })).toThrow(
      InvalidReceiptError,
    );
  });
});