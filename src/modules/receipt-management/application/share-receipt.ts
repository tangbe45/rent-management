import type { Receipt } from '../domain/receipt';
import { ReceiptDocumentMissingError, ReceiptSharingUnavailableError } from './errors';
import type { ReceiptDocumentStore, ReceiptSharer } from './receipt-document';

export class ShareReceipt {
  constructor(
    private readonly deps: {
      documents: ReceiptDocumentStore;
      sharer: ReceiptSharer;
    },
  ) {}

  async execute(receipt: Receipt): Promise<void> {
    const verification = this.deps.documents.verify(receipt.documentFileRef);
    if (!verification.exists || verification.size <= 0) {
      throw new ReceiptDocumentMissingError(receipt.id);
    }
    if (!(await this.deps.sharer.isAvailable())) {
      throw new ReceiptSharingUnavailableError();
    }
    await this.deps.sharer.share(this.deps.documents.locate(receipt.documentFileRef));
  }
}