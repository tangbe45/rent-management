import { Receipt } from '../domain/receipt';
import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';
import { ReceiptDocumentMissingError, ReceiptSharingUnavailableError } from './errors';
import type { ReceiptDocumentStore } from './receipt-document';
import { ShareReceipt } from './share-receipt';

const snapshot: ReceiptSnapshotData = {
  version: 1,
  language: 'en',
  receiptNumber: 'RCP-000001',
  generatedAt: 1000,
  landlord: { fullName: 'Landlord Name', phone: null, email: null, address: null },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
  tenant: { fullName: 'Amina Njeri', phone: null },
  payment: { paymentDate: '2026-01-05', method: 'CASH', reference: null, amount: 25_000 },
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

function receipt(): Receipt {
  return Receipt.hydrate({
    id: 'receipt-1',
    receiptNumber: 'RCP-000001',
    paymentId: 'payment-1',
    agreementId: 'agreement-1',
    language: 'en',
    snapshot,
    documentFileRef: 'receipts/receipt-1.pdf',
    documentSize: 987,
    createdAt: 1000,
  });
}

function createHarness() {
  const documents = {
    persist: jest.fn(),
    remove: jest.fn(),
    locate: jest.fn((fileRef: string) => `file:///documents/${fileRef}`),
    verify: jest.fn(() => ({ exists: true, size: 987 })),
    pruneOrphans: jest.fn(),
  } as unknown as jest.Mocked<ReceiptDocumentStore>;
  const sharer = {
    isAvailable: jest.fn(async () => true),
    share: jest.fn(async () => {}),
  };
  return { documents, sharer, useCase: new ShareReceipt({ documents, sharer }) };
}

describe('ShareReceipt', () => {
  it('shares the saved finalized PDF when the document exists and sharing is available', async () => {
    const { documents, sharer, useCase } = createHarness();

    await useCase.execute(receipt());

    expect(documents.verify).toHaveBeenCalledWith('receipts/receipt-1.pdf');
    expect(sharer.isAvailable).toHaveBeenCalledTimes(1);
    expect(sharer.share).toHaveBeenCalledWith('file:///documents/receipts/receipt-1.pdf');
  });

  it('raises the missing-document error and never checks sharing when the PDF is missing', async () => {
    const { documents, sharer, useCase } = createHarness();
    documents.verify.mockReturnValue({ exists: false, size: 0 });

    await expect(useCase.execute(receipt())).rejects.toThrow(ReceiptDocumentMissingError);
    expect(sharer.isAvailable).not.toHaveBeenCalled();
    expect(sharer.share).not.toHaveBeenCalled();
  });

  it('raises the missing-document error when the PDF is empty', async () => {
    const { documents, sharer, useCase } = createHarness();
    documents.verify.mockReturnValue({ exists: true, size: 0 });

    await expect(useCase.execute(receipt())).rejects.toThrow(ReceiptDocumentMissingError);
    expect(sharer.isAvailable).not.toHaveBeenCalled();
    expect(sharer.share).not.toHaveBeenCalled();
  });

  it('raises the sharing-unavailable error when the device cannot share', async () => {
    const { sharer, useCase } = createHarness();
    sharer.isAvailable.mockResolvedValue(false);

    await expect(useCase.execute(receipt())).rejects.toThrow(ReceiptSharingUnavailableError);
    expect(sharer.share).not.toHaveBeenCalled();
  });

  it('propagates a sharer failure without swallowing it', async () => {
    const { sharer, useCase } = createHarness();
    sharer.share.mockRejectedValue(new Error('share failed'));

    await expect(useCase.execute(receipt())).rejects.toThrow('share failed');
  });
});
