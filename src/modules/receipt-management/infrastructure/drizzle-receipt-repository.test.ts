import { LandlordSettings } from '../../settings/domain/landlord-settings';
import { Receipt } from '../domain/receipt';
import { buildReceiptSnapshot } from '../application/receipt-snapshot-builder';
import type { ReceiptContext } from '../application/receipt-context-lookup';
import {
  toReceiptData,
  toReceiptRow,
  type ReceiptRow,
} from './drizzle-receipt-repository';

const context: ReceiptContext = {
  payment: {
    id: 'payment-1',
    agreementId: 'agreement-1',
    amount: 25_000,
    paymentDate: '2026-03-05',
    method: 'BANK_TRANSFER',
    reference: 'BT-9',
    createdAt: 1000,
  },
  reversal: null,
  allocations: [{ installmentDueDate: '2026-01-01', amount: 25_000 }],
  tenant: { fullName: 'Tenant', phone: null },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
};

const { snapshot } = buildReceiptSnapshot({
  receiptNumber: 'RCP-000001',
  language: 'en',
  generatedAt: 1000,
  landlordFullName: 'Landlord Name',
  settings: LandlordSettings.defaults().value,
  context,
  assets: { logo: null, signature: null, stamp: null },
});

const receipt = Receipt.create({
  id: 'receipt-1',
  receiptNumber: 'RCP-000001',
  paymentId: 'payment-1',
  agreementId: 'agreement-1',
  language: 'en',
  snapshot,
  documentFileRef: 'receipts/receipt-1.pdf',
  documentSize: 1234,
  createdAt: 1000,
});

describe('drizzle receipt row mapping', () => {
  it('round-trips a receipt preserving the immutable snapshot', () => {
    const row: ReceiptRow = toReceiptRow(receipt);
    expect(row.id).toBe('receipt-1');
    expect(row.receiptNumber).toBe('RCP-000001');
    expect(row.paymentId).toBe('payment-1');
    expect(row.agreementId).toBe('agreement-1');
    expect(row.language).toBe('en');
    expect(row.documentFileRef).toBe('receipts/receipt-1.pdf');
    expect(row.documentSize).toBe(1234);
    expect(row.createdAt).toBe(1000);
    expect(typeof row.snapshot).toBe('string');

    const restored = Receipt.hydrate(toReceiptData(row));
    expect(restored.snapshot).toEqual(snapshot);
    expect(restored.snapshot.payment.amount).toBe(25_000);
    expect(restored.snapshot.allocations[0]?.amount).toBe(25_000);
  });

  it('rejects a corrupt stored snapshot on read', () => {
    expect(() => toReceiptData({ ...toReceiptRow(receipt), snapshot: '{oops' })).toThrow();
  });
});