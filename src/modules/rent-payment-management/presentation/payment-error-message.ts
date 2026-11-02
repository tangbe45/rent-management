import type { TranslationKey } from '../../../shared/i18n';
import { SubscriptionExpiredError } from '../../subscription/application/errors';
import { InvalidRentPaymentError } from '../domain/payment';
import { InvalidRentPaymentReversalError } from '../domain/payment-reversal';
import {
  RentAgreementNotFoundError,
  RentPaymentAlreadyReversedError,
  RentPaymentNotFoundError,
} from '../application/errors';

/**
 * Maps a caught rent-payment error to a translation key so screens never
 * hard-code user-facing copy.
 */
export function paymentErrorKey(caught: unknown): TranslationKey {
  if (caught instanceof SubscriptionExpiredError) {
    return 'rent.error.subscription';
  }
  if (caught instanceof RentAgreementNotFoundError) {
    return 'rent.error.agreementMissing';
  }
  if (caught instanceof RentPaymentNotFoundError) {
    return 'rent.error.paymentMissing';
  }
  if (caught instanceof RentPaymentAlreadyReversedError) {
    return 'rent.error.alreadyReversed';
  }
  if (caught instanceof InvalidRentPaymentReversalError) {
    return caught.message.toLowerCase().includes('explanation')
      ? 'rent.error.explanationRequired'
      : 'rent.error.reasonRequired';
  }
  if (caught instanceof InvalidRentPaymentError) {
    return 'rent.error.amountInvalid';
  }
  return 'rent.error.generic';
}
