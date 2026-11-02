import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { RentPaymentAllocation } from './allocation';
import type { RentInstallment } from './installment';
import type { PaymentMethod, RentPayment } from './payment';
import type { RentPaymentReversal } from './payment-reversal';

export const DEFAULT_RENT_PAYMENT_PAGE_SIZE = 20;

export interface RentPaymentFilter {
  agreementId?: string;
  agreementIds?: readonly string[];
  methods?: readonly PaymentMethod[];
  fromDate?: CalendarDateString;
  toDate?: CalendarDateString;
}

/**
 * Persistence boundary for persisted rent obligations. A unique
 * (agreement, due date) guarantee in the database is the last line of defence
 * against duplicate installments; window queries are the primary mechanism for
 * idempotent lazy generation.
 */
export interface RentInstallmentRepository {
  save(installment: RentInstallment): void;
  findById(id: string): RentInstallment | null;
  findByIds(ids: readonly string[]): RentInstallment[];
  findByAgreementId(agreementId: string): RentInstallment[];
  findByAgreementWindow(
    agreementId: string,
    from: CalendarDateString,
    to: CalendarDateString,
  ): RentInstallment[];
  deleteByAgreement(agreementId: string): void;
}

/**
 * Persistence boundary for payments, their allocations and their reversals.
 * Payments and allocations are written together inside one transaction; a
 * reversal is written as a separate record and never mutates the payment.
 */
export interface RentPaymentRepository {
  save(payment: RentPayment): void;
  findById(id: string): RentPayment | null;
  findAll(filter?: RentPaymentFilter): RentPayment[];

  saveAllocations(allocations: readonly RentPaymentAllocation[]): void;
  findAllocationsByPaymentId(paymentId: string): RentPaymentAllocation[];
  findAllocationsByPaymentIds(paymentIds: readonly string[]): RentPaymentAllocation[];
  findAllocationsByInstallmentIds(installmentIds: readonly string[]): RentPaymentAllocation[];

  saveReversal(reversal: RentPaymentReversal): void;
  findReversalByPaymentId(paymentId: string): RentPaymentReversal | null;
  findReversalsByPaymentIds(paymentIds: readonly string[]): RentPaymentReversal[];
}
