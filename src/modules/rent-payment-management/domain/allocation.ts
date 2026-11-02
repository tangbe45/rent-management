import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import { requireDueDate, requireIdentifier, requirePositiveMinorUnits } from './installment';

export interface RentPaymentAllocationData {
  id: string;
  paymentId: string;
  installmentId: string;
  installmentDueDate: CalendarDateString;
  amount: number;
  createdAt: number;
}

/**
 * One slice of a payment applied to one installment. An allocation is immutable
 * and always equals part (or all) of a single payment against a single rent
 * period. `installmentDueDate` is a snapshot of the scheduled period at the time
 * the payment was recorded, so payment history stays readable even if the
 * installment is later discarded during a pre-start term change.
 */
export class RentPaymentAllocation {
  private constructor(
    readonly id: string,
    readonly paymentId: string,
    readonly installmentId: string,
    readonly installmentDueDate: CalendarDateString,
    readonly amount: number,
    readonly createdAt: number,
  ) {}

  static create(input: {
    id: string;
    paymentId: string;
    installmentId: string;
    installmentDueDate: string;
    amount: number;
    createdAt: number;
  }): RentPaymentAllocation {
    return new RentPaymentAllocation(
      requireIdentifier(input.id, 'Allocation'),
      requireIdentifier(input.paymentId, 'Payment'),
      requireIdentifier(input.installmentId, 'Installment'),
      requireDueDate(input.installmentDueDate),
      requirePositiveMinorUnits(input.amount, 'An allocation amount must be greater than zero.'),
      input.createdAt,
    );
  }

  static hydrate(data: RentPaymentAllocationData): RentPaymentAllocation {
    return RentPaymentAllocation.create(data);
  }
}
