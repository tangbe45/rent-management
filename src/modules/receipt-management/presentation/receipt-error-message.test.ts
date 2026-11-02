import { SubscriptionExpiredError } from '../../subscription/application/errors';
import {
  ReceiptDocumentCreationError,
  ReceiptDocumentMissingError,
  ReceiptPaymentNotFoundError,
  ReceiptSharingUnavailableError,
  ReversedPaymentError,
} from '../application/errors';
import { receiptErrorKey } from './receipt-error-message';

describe('receiptErrorKey', () => {
  it('maps each reliably distinguishable error to its own message', () => {
    expect(receiptErrorKey(new SubscriptionExpiredError())).toBe('receipt.error.subscription');
    expect(receiptErrorKey(new ReceiptPaymentNotFoundError('payment-1'))).toBe(
      'receipt.error.paymentMissing',
    );
    expect(receiptErrorKey(new ReversedPaymentError('payment-1'))).toBe('receipt.error.reversed');
    expect(receiptErrorKey(new ReceiptDocumentMissingError('receipt-1'))).toBe(
      'receipt.details.documentMissing',
    );
    expect(receiptErrorKey(new ReceiptDocumentCreationError())).toBe('receipt.error.document');
    expect(receiptErrorKey(new ReceiptSharingUnavailableError())).toBe(
      'receipt.error.shareUnavailable',
    );
  });

  it('falls back to a generic message for anything else', () => {
    expect(receiptErrorKey(new Error('boom'))).toBe('receipt.error.generic');
    expect(receiptErrorKey(undefined)).toBe('receipt.error.generic');
  });
});
