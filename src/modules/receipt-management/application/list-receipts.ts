import type { Receipt } from '../domain/receipt';
import type { ReceiptRepository } from '../domain/receipt-repository';
import type { ReceiptContextLookup } from './receipt-context-lookup';

export interface ReceiptListItem {
  receipt: Receipt;
  reversed: boolean;
}

/**
 * Newest-first receipt history. The reversal indicator is derived from the
 * authoritative payment state and is never stored as a second receipt state.
 */
export class ListReceipts {
  constructor(
    private readonly deps: {
      receipts: ReceiptRepository;
      context: ReceiptContextLookup;
    },
  ) {}

  execute(): ReceiptListItem[] {
    const all = this.deps.receipts.findAll();
    const reversedPaymentIds = this.deps.context.findReversedPaymentIds(
      all.map((receipt) => receipt.paymentId),
    );
    return all
      .map((receipt) => ({ receipt, reversed: reversedPaymentIds.has(receipt.paymentId) }))
      .sort((a, b) => b.receipt.createdAt - a.receipt.createdAt);
  }
}