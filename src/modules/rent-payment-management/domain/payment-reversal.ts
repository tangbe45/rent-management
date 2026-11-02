import { requireIdentifier } from './installment';

export const PAYMENT_REVERSAL_REASONS = [
  'WRONG_AMOUNT',
  'WRONG_RENT',
  'DUPLICATE',
  'OTHER',
] as const;

export type PaymentReversalReason = (typeof PAYMENT_REVERSAL_REASONS)[number];

export function isPaymentReversalReason(value: string): value is PaymentReversalReason {
  return (PAYMENT_REVERSAL_REASONS as readonly string[]).includes(value);
}

export interface RentPaymentReversalData {
  paymentId: string;
  reason: PaymentReversalReason;
  explanation: string | null;
  reversedAt: number;
}

/**
 * A reversal is a separate immutable fact that neutralizes the accounting effect
 * of a payment without deleting or editing it. The payment keeps its original
 * amount, date, method, reference, notes and allocations; the reversal record
 * carries the reason (and an explanation when the reason is OTHER). At most one
 * reversal exists per payment, keyed by `paymentId`.
 */
export class RentPaymentReversal {
  private constructor(
    readonly paymentId: string,
    readonly reason: PaymentReversalReason,
    readonly explanation: string | null,
    readonly reversedAt: number,
  ) {}

  static create(input: {
    paymentId: string;
    reason: string;
    explanation?: string | null;
    reversedAt: number;
  }): RentPaymentReversal {
    if (!isPaymentReversalReason(input.reason)) {
      throw new InvalidRentPaymentReversalError('Select a reason for reversing this payment.');
    }
    const explanation = normalizeExplanation(input.explanation);
    if (input.reason === 'OTHER' && explanation === null) {
      throw new InvalidRentPaymentReversalError(
        'An explanation is required when the reversal reason is "Other".',
      );
    }
    return new RentPaymentReversal(
      requireIdentifier(input.paymentId, 'Payment'),
      input.reason,
      explanation,
      input.reversedAt,
    );
  }

  static hydrate(data: RentPaymentReversalData): RentPaymentReversal {
    return RentPaymentReversal.create(data);
  }
}

function normalizeExplanation(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = value.trim();
  return text.length === 0 ? null : text;
}

export class InvalidRentPaymentReversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRentPaymentReversalError';
  }
}
