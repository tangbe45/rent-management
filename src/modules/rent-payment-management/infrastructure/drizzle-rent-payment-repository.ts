import { and, asc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';

import type { Database } from '../../../shared/infrastructure/database/connection';
import {
  rentInstallments,
  rentPaymentAllocations,
  rentPaymentReversals,
  rentPayments,
} from '../../../shared/infrastructure/database/schema/rent-payments';
import {
  RentPaymentAllocation,
  type RentPaymentAllocationData,
} from '../domain/allocation';
import { RentInstallment, type RentInstallmentData } from '../domain/installment';
import { RentPayment, type PaymentMethod, type RentPaymentData } from '../domain/payment';
import {
  RentPaymentReversal,
  type PaymentReversalReason,
  type RentPaymentReversalData,
} from '../domain/payment-reversal';
import type {
  RentInstallmentRepository,
  RentPaymentFilter,
  RentPaymentRepository,
} from '../domain/rent-payment-repository';

/**
 * Structural row shapes. Declaring them explicitly keeps the Drizzle-specific
 * row types out of the pure mapping helpers, which are unit-tested without a
 * database.
 */
export interface RentInstallmentRow {
  id: string;
  agreementId: string;
  dueDate: string;
  periodIndex: number;
  amount: number;
  createdAt: number;
}

export interface RentPaymentRow {
  id: string;
  agreementId: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: number;
}

export interface RentPaymentAllocationRow {
  id: string;
  paymentId: string;
  installmentId: string;
  installmentDueDate: string;
  amount: number;
  createdAt: number;
}

export interface RentPaymentReversalRow {
  paymentId: string;
  reason: PaymentReversalReason;
  explanation: string | null;
  reversedAt: number;
}

export function toRentInstallmentData(row: RentInstallmentRow): RentInstallmentData {
  return {
    id: row.id,
    agreementId: row.agreementId,
    dueDate: row.dueDate,
    periodIndex: row.periodIndex,
    amount: row.amount,
    createdAt: row.createdAt,
  };
}

export function toRentInstallmentRow(installment: RentInstallment): RentInstallmentRow {
  return {
    id: installment.id,
    agreementId: installment.agreementId,
    dueDate: installment.dueDate,
    periodIndex: installment.periodIndex,
    amount: installment.amount,
    createdAt: installment.createdAt,
  };
}

export function toRentPaymentData(row: RentPaymentRow): RentPaymentData {
  return {
    id: row.id,
    agreementId: row.agreementId,
    amount: row.amount,
    paymentDate: row.paymentDate,
    method: row.method,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

export function toRentPaymentRow(payment: RentPayment): RentPaymentRow {
  return {
    id: payment.id,
    agreementId: payment.agreementId,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    createdAt: payment.createdAt,
  };
}

export function toRentPaymentAllocationData(
  row: RentPaymentAllocationRow,
): RentPaymentAllocationData {
  return {
    id: row.id,
    paymentId: row.paymentId,
    installmentId: row.installmentId,
    installmentDueDate: row.installmentDueDate,
    amount: row.amount,
    createdAt: row.createdAt,
  };
}

export function toRentPaymentAllocationRow(
  allocation: RentPaymentAllocation,
): RentPaymentAllocationRow {
  return {
    id: allocation.id,
    paymentId: allocation.paymentId,
    installmentId: allocation.installmentId,
    installmentDueDate: allocation.installmentDueDate,
    amount: allocation.amount,
    createdAt: allocation.createdAt,
  };
}

export function toRentPaymentReversalData(row: RentPaymentReversalRow): RentPaymentReversalData {
  return {
    paymentId: row.paymentId,
    reason: row.reason,
    explanation: row.explanation,
    reversedAt: row.reversedAt,
  };
}

export function toRentPaymentReversalRow(
  reversal: RentPaymentReversal,
): RentPaymentReversalRow {
  return {
    paymentId: reversal.paymentId,
    reason: reversal.reason,
    explanation: reversal.explanation,
    reversedAt: reversal.reversedAt,
  };
}

/**
 * Drizzle-backed installments. `save` is idempotent on the (agreement, due date)
 * unique index so repeated lazy generation can never create a duplicate period.
 */
export class DrizzleRentInstallmentRepository implements RentInstallmentRepository {
  constructor(private readonly db: Database) {}

  save(installment: RentInstallment): void {
    this.db
      .insert(rentInstallments)
      .values(toRentInstallmentRow(installment))
      .onConflictDoNothing()
      .run();
  }

  findById(id: string): RentInstallment | null {
    const row = this.db.select().from(rentInstallments).where(eq(rentInstallments.id, id)).get();
    return row ? RentInstallment.hydrate(toRentInstallmentData(row)) : null;
  }

  findByIds(ids: readonly string[]): RentInstallment[] {
    if (ids.length === 0) {
      return [];
    }
    const rows = this.db
      .select()
      .from(rentInstallments)
      .where(inArray(rentInstallments.id, [...ids]))
      .all();
    return rows.map((row) => RentInstallment.hydrate(toRentInstallmentData(row)));
  }

  findByAgreementId(agreementId: string): RentInstallment[] {
    const rows = this.db
      .select()
      .from(rentInstallments)
      .where(eq(rentInstallments.agreementId, agreementId))
      .orderBy(asc(rentInstallments.dueDate))
      .all();
    return rows.map((row) => RentInstallment.hydrate(toRentInstallmentData(row)));
  }

  findByAgreementWindow(
    agreementId: string,
    from: string,
    to: string,
  ): RentInstallment[] {
    const rows = this.db
      .select()
      .from(rentInstallments)
      .where(
        and(
          eq(rentInstallments.agreementId, agreementId),
          gte(rentInstallments.dueDate, from),
          lte(rentInstallments.dueDate, to),
        ),
      )
      .orderBy(asc(rentInstallments.dueDate))
      .all();
    return rows.map((row) => RentInstallment.hydrate(toRentInstallmentData(row)));
  }

  deleteByAgreement(agreementId: string): void {
    this.db.delete(rentInstallments).where(eq(rentInstallments.agreementId, agreementId)).run();
  }
}

/**
 * Drizzle-backed payments, allocations and reversals. Payments and allocations
 * are written together inside one transaction; reversals are separate records
 * and never mutate the original payment.
 */
export class DrizzleRentPaymentRepository implements RentPaymentRepository {
  constructor(private readonly db: Database) {}

  save(payment: RentPayment): void {
    this.db.insert(rentPayments).values(toRentPaymentRow(payment)).run();
  }

  findById(id: string): RentPayment | null {
    const row = this.db.select().from(rentPayments).where(eq(rentPayments.id, id)).get();
    return row ? RentPayment.hydrate(toRentPaymentData(row)) : null;
  }

  findAll(filter: RentPaymentFilter = {}): RentPayment[] {
    const conditions: SQL[] = [];
    if (filter.agreementId !== undefined) {
      conditions.push(eq(rentPayments.agreementId, filter.agreementId));
    }
    if (filter.agreementIds !== undefined) {
      if (filter.agreementIds.length === 0) {
        return [];
      }
      conditions.push(inArray(rentPayments.agreementId, [...filter.agreementIds]));
    }
    if (filter.fromDate !== undefined) {
      conditions.push(gte(rentPayments.paymentDate, filter.fromDate));
    }
    if (filter.toDate !== undefined) {
      conditions.push(lte(rentPayments.paymentDate, filter.toDate));
    }
    if (filter.methods !== undefined) {
      if (filter.methods.length === 0) {
        return [];
      }
      conditions.push(inArray(rentPayments.method, [...filter.methods]));
    }
    const rows =
      conditions.length === 0
        ? this.db.select().from(rentPayments).all()
        : this.db
            .select()
            .from(rentPayments)
            .where(and(...conditions))
            .all();
    return rows.map((row) => RentPayment.hydrate(toRentPaymentData(row)));
  }

  saveAllocations(allocations: readonly RentPaymentAllocation[]): void {
    if (allocations.length === 0) {
      return;
    }
    this.db
      .insert(rentPaymentAllocations)
      .values(allocations.map((allocation) => toRentPaymentAllocationRow(allocation)))
      .run();
  }

  findAllocationsByPaymentId(paymentId: string): RentPaymentAllocation[] {
    return this.findAllocationsByPaymentIds([paymentId]);
  }

  findAllocationsByPaymentIds(paymentIds: readonly string[]): RentPaymentAllocation[] {
    if (paymentIds.length === 0) {
      return [];
    }
    const rows = this.db
      .select()
      .from(rentPaymentAllocations)
      .where(inArray(rentPaymentAllocations.paymentId, [...paymentIds]))
      .all();
    return rows.map((row) => RentPaymentAllocation.hydrate(toRentPaymentAllocationData(row)));
  }

  findAllocationsByInstallmentIds(installmentIds: readonly string[]): RentPaymentAllocation[] {
    if (installmentIds.length === 0) {
      return [];
    }
    const rows = this.db
      .select()
      .from(rentPaymentAllocations)
      .where(inArray(rentPaymentAllocations.installmentId, [...installmentIds]))
      .all();
    return rows.map((row) => RentPaymentAllocation.hydrate(toRentPaymentAllocationData(row)));
  }

  saveReversal(reversal: RentPaymentReversal): void {
    this.db.insert(rentPaymentReversals).values(toRentPaymentReversalRow(reversal)).run();
  }

  findReversalByPaymentId(paymentId: string): RentPaymentReversal | null {
    const row = this.db
      .select()
      .from(rentPaymentReversals)
      .where(eq(rentPaymentReversals.paymentId, paymentId))
      .get();
    return row ? RentPaymentReversal.hydrate(toRentPaymentReversalData(row)) : null;
  }

  findReversalsByPaymentIds(paymentIds: readonly string[]): RentPaymentReversal[] {
    if (paymentIds.length === 0) {
      return [];
    }
    const rows = this.db
      .select()
      .from(rentPaymentReversals)
      .where(inArray(rentPaymentReversals.paymentId, [...paymentIds]))
      .all();
    return rows.map((row) => RentPaymentReversal.hydrate(toRentPaymentReversalData(row)));
  }
}
