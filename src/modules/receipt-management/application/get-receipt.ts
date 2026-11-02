import type { Receipt } from '../domain/receipt';
import type { ReceiptRepository } from '../domain/receipt-repository';
import type { ReceiptContextLookup } from './receipt-context-lookup';

export interface ReceiptView {
  receipt: Receipt;
  reversed: boolean;
}

export class GetReceipt {
  constructor(
    private readonly deps: {
      receipts: ReceiptRepository;
      context: ReceiptContextLookup;
    },
  ) {}

  execute(receiptId: string): ReceiptView | null {
    const receipt = this.deps.receipts.findById(receiptId);
    if (receipt === null) {
      return null;
    }
    return { receipt, reversed: this.deps.context.isReversed(receipt.paymentId) };
  }
}

/**
 * Finds the (single) receipt for a payment without exposing the repository to
 * presentation. Used by payment details to decide whether to offer "generate"
 * or "view".
 */
export class GetReceiptForPayment {
  constructor(
    private readonly deps: {
      receipts: ReceiptRepository;
      context: ReceiptContextLookup;
    },
  ) {}

  execute(paymentId: string): ReceiptView | null {
    const receipt = this.deps.receipts.findByPaymentId(paymentId);
    if (receipt === null) {
      return null;
    }
    return { receipt, reversed: this.deps.context.isReversed(paymentId) };
  }
}