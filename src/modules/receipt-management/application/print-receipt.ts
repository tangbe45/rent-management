import type { Receipt } from '../domain/receipt';
import { ReceiptDocumentMissingError } from './errors';
import type { ReceiptDocumentStore, ReceiptPrinter } from './receipt-document';

export class PrintReceipt {
  constructor(
    private readonly deps: {
      documents: ReceiptDocumentStore;
      printer: ReceiptPrinter;
    },
  ) {}

  async execute(receipt: Receipt): Promise<void> {
    const verification = this.deps.documents.verify(receipt.documentFileRef);
    if (!verification.exists || verification.size <= 0) {
      throw new ReceiptDocumentMissingError(receipt.id);
    }
    await this.deps.printer.print(this.deps.documents.locate(receipt.documentFileRef));
  }
}