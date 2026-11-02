import { SubscriptionExpiredError } from '../../subscription/application/errors';
import { InvalidRentPaymentError } from '../domain/payment';
import { InvalidRentPaymentReversalError } from '../domain/payment-reversal';
import {
  RentAgreementNotFoundError,
  RentPaymentAlreadyReversedError,
  RentPaymentNotFoundError,
} from '../application/errors';
import { paymentErrorKey } from './payment-error-message';

describe('paymentErrorKey', () => {
  it('maps each known error to a specific translation key', () => {
    expect(paymentErrorKey(new SubscriptionExpiredError())).toBe('rent.error.subscription');
    expect(paymentErrorKey(new RentAgreementNotFoundError('a-1'))).toBe('rent.error.agreementMissing');
    expect(paymentErrorKey(new RentPaymentNotFoundError('p-1'))).toBe('rent.error.paymentMissing');
    expect(paymentErrorKey(new RentPaymentAlreadyReversedError('p-1'))).toBe('rent.error.alreadyReversed');
    expect(paymentErrorKey(new InvalidRentPaymentError('bad'))).toBe('rent.error.amountInvalid');
  });

  it('distinguishes a missing explanation from a missing reason when reversing', () => {
    expect(
      paymentErrorKey(
        new InvalidRentPaymentReversalError(
          'An explanation is required when the reversal reason is "Other".',
        ),
      ),
    ).toBe('rent.error.explanationRequired');
    expect(paymentErrorKey(new InvalidRentPaymentReversalError('Select a reason for reversing this payment.'))).toBe(
      'rent.error.reasonRequired',
    );
  });

  it('falls back to the generic key for anything else', () => {
    expect(paymentErrorKey(new Error('boom'))).toBe('rent.error.generic');
    expect(paymentErrorKey('not-an-error')).toBe('rent.error.generic');
  });
});
