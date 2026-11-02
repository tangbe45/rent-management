import type { TranslationKey } from '../../../shared/i18n';
import { SubscriptionExpiredError } from '../../subscription/application/errors';
import {
  ReceiptDocumentCreationError,
  ReceiptDocumentMissingError,
  ReceiptPaymentNotFoundError,
  ReceiptSharingUnavailableError,
  ReversedPaymentError,
} from '../application/errors';

/**
 * Maps a caught receipt error to a translation key so screens never hard-code
 * user-facing copy. Only categories the adapters can reliably distinguish are
 * mapped; anything else (including a cancelled native dialog, which the print
 * and share APIs do not expose) falls back to the generic message.
 */
export function receiptErrorKey(caught: unknown): TranslationKey {
  if (caught instanceof SubscriptionExpiredError) {
    return 'receipt.error.subscription';
  }
  if (caught instanceof ReceiptPaymentNotFoundError) {
    return 'receipt.error.paymentMissing';
  }
  if (caught instanceof ReversedPaymentError) {
    return 'receipt.error.reversed';
  }
  if (caught instanceof ReceiptDocumentMissingError) {
    return 'receipt.details.documentMissing';
  }
  if (caught instanceof ReceiptDocumentCreationError) {
    return 'receipt.error.document';
  }
  if (caught instanceof ReceiptSharingUnavailableError) {
    return 'receipt.error.shareUnavailable';
  }
  return 'receipt.error.generic';
}