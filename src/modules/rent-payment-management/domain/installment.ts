import {
  compareCalendarDates,
  isValidCalendarDate,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';

/**
 * Installment status is always derived from the persisted snapshot, the net
 * allocated amount and the current local date. It is never stored: a stored
 * status would drift from the payment history it is supposed to summarize.
 *
 * Priority (see the sealed payment rules):
 * 1. remaining balance is zero            -> PAID
 * 2. balance remains and today > due date  -> OVERDUE
 * 3. balance remains and some money paid   -> PARTIAL
 * 4. nothing paid and due date <= today    -> DUE
 * 5. otherwise                             -> UPCOMING
 *
 * Overdue wins over partially paid. A due date equal to today is DUE, not
 * OVERDUE.
 */
export type InstallmentStatus = 'PAID' | 'OVERDUE' | 'PARTIAL' | 'DUE' | 'UPCOMING';

export const INSTALLMENT_STATUSES: readonly InstallmentStatus[] = [
  'PAID',
  'OVERDUE',
  'PARTIAL',
  'DUE',
  'UPCOMING',
];

export interface RentInstallmentData {
  id: string;
  agreementId: string;
  dueDate: CalendarDateString;
  periodIndex: number;
  amount: number;
  createdAt: number;
}

export interface InstallmentStanding {
  status: InstallmentStatus;
  paidAmount: number;
  remainingAmount: number;
}

/**
 * A persisted rent obligation. The amount and due date are immutable snapshots:
 * they record what was owed for a scheduled period at the time the obligation
 * was first materialized. Agreement term changes before the start date are
 * handled by the application layer by discarding unallocated installments and
 * regenerating them, never by mutating an installment that already carries
 * history.
 */
export class RentInstallment {
  private constructor(
    readonly id: string,
    readonly agreementId: string,
    readonly dueDate: CalendarDateString,
    readonly periodIndex: number,
    readonly amount: number,
    readonly createdAt: number,
  ) {}

  static create(input: {
    id: string;
    agreementId: string;
    dueDate: string;
    periodIndex: number;
    amount: number;
    createdAt: number;
  }): RentInstallment {
    return new RentInstallment(
      requireIdentifier(input.id, 'Installment'),
      requireIdentifier(input.agreementId, 'Agreement'),
      requireDueDate(input.dueDate),
      requirePeriodIndex(input.periodIndex),
      requirePositiveMinorUnits(input.amount),
      input.createdAt,
    );
  }

  static hydrate(data: RentInstallmentData): RentInstallment {
    return RentInstallment.create(data);
  }
}

/**
 * Derives an installment's status and money standing from its scheduled amount,
 * the net allocated amount (allocations of reversed payments excluded) and the
 * current local date.
 */
export function deriveInstallmentStanding(input: {
  dueDate: CalendarDateString;
  amount: number;
  paidAmount: number;
  today: CalendarDateString;
}): InstallmentStanding {
  const paidAmount = Math.max(0, Math.min(input.paidAmount, input.amount));
  const remainingAmount = input.amount - paidAmount;

  let status: InstallmentStatus;
  if (remainingAmount <= 0) {
    status = 'PAID';
  } else if (compareCalendarDates(input.dueDate, input.today) < 0) {
    status = 'OVERDUE';
  } else if (paidAmount > 0) {
    status = 'PARTIAL';
  } else if (compareCalendarDates(input.dueDate, input.today) === 0) {
    status = 'DUE';
  } else {
    status = 'UPCOMING';
  }

  return { status, paidAmount, remainingAmount };
}

export function requireIdentifier(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidRentInstallmentError(`${label} identifier is required.`);
  }
  return trimmed;
}

export function requireDueDate(value: string): CalendarDateString {
  const trimmed = value.trim();
  if (!isValidCalendarDate(trimmed)) {
    throw new InvalidRentInstallmentError('The due date must be a valid calendar date (YYYY-MM-DD).');
  }
  return trimmed;
}

function requirePeriodIndex(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidRentInstallmentError('The period index must be a non-negative integer.');
  }
  return value;
}

export function requirePositiveMinorUnits(value: number, message?: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InvalidRentInstallmentError(
      message ?? 'Amounts must be positive integers expressed in minor units.',
    );
  }
  return value;
}

export class InvalidRentInstallmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRentInstallmentError';
  }
}
