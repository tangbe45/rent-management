import { Receipt } from '../domain/receipt';
import type { ReceiptSnapshotData } from '../domain/receipt-snapshot';
import { ReceiptDocumentMissingError } from './errors';
import { PrintReceipt } from './print-receipt';
import type { ReceiptDocumentStore } from './receipt-document';

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
  const printer = { print: jest.fn(async () => {}) };
  return { documents, printer, useCase: new PrintReceipt({ documents, printer }) };
}

describe('PrintReceipt', () => {
  it('prints the saved finalized PDF when the document exists and is non-empty', async () => {
    const { documents, printer, useCase } = createHarness();

    await useCase.execute(receipt());

    expect(documents.verify).toHaveBeenCalledWith('receipts/receipt-1.pdf');
    expect(documents.locate).toHaveBeenCalledWith('receipts/receipt-1.pdf');
    expect(printer.print).toHaveBeenCalledWith('file:///documents/receipts/receipt-1.pdf');
  });

  it('raises the missing-document error when the PDF does not exist', async () => {
    const { documents, printer, useCase } = createHarness();
    documents.verify.mockReturnValue({ exists: false, size: 0 });

    await expect(useCase.execute(receipt())).rejects.toThrow(ReceiptDocumentMissingError);
    expect(printer.print).not.toHaveBeenCalled();
  });

  it('raises the missing-document error when the PDF is empty', async () => {
    const { documents, printer, useCase } = createHarness();
    documents.verify.mockReturnValue({ exists: true, size: 0 });

    await expect(useCase.execute(receipt())).rejects.toThrow(ReceiptDocumentMissingError);
    expect(printer.print).not.toHaveBeenCalled();
  });

  it('propagates a printer failure without swallowing it', async () => {
    const { printer, useCase } = createHarness();
    printer.print.mockRejectedValue(new Error('printer unavailable'));

    await expect(useCase.execute(receipt())).rejects.toThrow('printer unavailable');
  });
});
