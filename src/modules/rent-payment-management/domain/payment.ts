import { isValidCalendarDate, type CalendarDateString } from '../../../shared/domain/calendar-date';
import { requireIdentifier, requirePositiveMinorUnits } from './installment';

export const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export interface RentPaymentData {
  id: string;
  agreementId: string;
  amount: number;
  paymentDate: CalendarDateString;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: number;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = value.trim();
  return text.length === 0 ? null : text;
}

function normalizePaymentDate(value: string): CalendarDateString {
  const trimmed = value.trim();
  if (!isValidCalendarDate(trimmed)) {
    throw new InvalidRentPaymentError('The payment date must be a valid calendar date (YYYY-MM-DD).');
  }
  return trimmed;
}

function normalizeMethod(value: string): PaymentMethod {
  if (!isPaymentMethod(value)) {
    throw new InvalidRentPaymentError(`The payment method "${value}" is not supported.`);
  }
  return value;
}

/**
 * A rent payment is money actually received from a tenant for one rental
 * agreement. It is immutable: an incorrect payment is reversed by a separate
 * reversal record, never edited or deleted, so the audit trail survives.
 *
 * Money is stored as integer minor units; the MVP has a single implicit
 * currency and no currency column.
 */
export class RentPayment {
  private constructor(
    readonly id: string,
    readonly agreementId: string,
    readonly amount: number,
    readonly paymentDate: CalendarDateString,
    readonly method: PaymentMethod,
    readonly reference: string | null,
    readonly notes: string | null,
    readonly createdAt: number,
  ) {}

  static create(input: {
    id: string;
    agreementId: string;
    amount: number;
    paymentDate: string;
    method: string;
    reference?: string | null;
    notes?: string | null;
    createdAt: number;
  }): RentPayment {
    return new RentPayment(
      requireIdentifier(input.id, 'Payment'),
      requireIdentifier(input.agreementId, 'Agreement'),
      requirePositiveMinorUnits(input.amount, 'The payment amount must be greater than zero.'),
      normalizePaymentDate(input.paymentDate),
      normalizeMethod(input.method),
      normalizeOptionalText(input.reference),
      normalizeOptionalText(input.notes),
      input.createdAt,
    );
  }

  static hydrate(data: RentPaymentData): RentPayment {
    return RentPayment.create(data);
  }
}

export class InvalidRentPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRentPaymentError';
  }
}
