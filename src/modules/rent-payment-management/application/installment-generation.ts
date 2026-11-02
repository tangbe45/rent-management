import {
  compareCalendarDates,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import type { RentFrequency } from '../../rental-agreement-management/domain/rental-agreement';
import {
  addCalendarMonths,
  calculateRentSchedule,
} from '../../rental-agreement-management/domain/rent-schedule';
import { RentInstallment } from '../domain/installment';
import { RentAgreementNotFoundError } from './errors';
import type { RentPaymentRepositories } from './rent-payment-unit-of-work';

/**
 * How far ahead an open-ended agreement's obligations are materialized. The
 * sealed rule is lazy generation, so nothing is generated beyond the effective
 * end date or, for an open-ended agreement, this rolling horizon.
 */
export const RENT_PAYMENT_GENERATION_HORIZON_MONTHS = 12;

export interface PlannedInstallment {
  dueDate: CalendarDateString;
  periodIndex: number;
  amount: number;
}

/**
 * The inclusive upper bound for generation: the effective end date when one
 * exists, otherwise a rolling horizon. A requested bound may narrow this but
 * can never widen it, so an unbounded future schedule is never created.
 */
export function resolveGenerationUpperBound(input: {
  effectiveEndDate: CalendarDateString | null;
  today: CalendarDateString;
  requestedTo?: CalendarDateString;
}): CalendarDateString {
  const cap =
    input.effectiveEndDate ?? addCalendarMonths(input.today, RENT_PAYMENT_GENERATION_HORIZON_MONTHS);
  if (input.requestedTo === undefined) {
    return cap;
  }
  return compareCalendarDates(input.requestedTo, cap) <= 0 ? input.requestedTo : cap;
}

/**
 * Plans the scheduled obligations in an inclusive `[from, to]` window using the
 * agreement's sealed schedule rules (anchored to the first due date, advanced by
 * frequency, independent occurrences so short months do not drift). `periodIndex`
 * is the occurrence index from the original anchor and is preserved even when
 * the lower bound filters earlier periods out.
 */
export function planInstallments(input: {
  anchor: CalendarDateString;
  frequency: RentFrequency;
  amount: number;
  from: CalendarDateString;
  to: CalendarDateString;
}): PlannedInstallment[] {
  return calculateRentSchedule(input.anchor, input.frequency, input.to)
    .map((dueDate, periodIndex) => ({ dueDate, periodIndex, amount: input.amount }))
    .filter((planned) => compareCalendarDates(planned.dueDate, input.from) >= 0);
}

export interface EnsureInstallmentsInput {
  agreementId: string;
  from?: CalendarDateString;
  to?: CalendarDateString;
}

/**
 * Materializes the persisted obligations for an agreement's inclusive
 * `[from, to]` window, creating only the missing ones. It is idempotent: the
 * unique (agreement, due date) constraint plus an existence check make repeated
 * calls safe, and no installment is ever created past the effective end date.
 *
 * This is a free function so both the standalone use case and the payment-
 * recording transaction can reuse the exact same logic.
 */
export function ensureInstallments(
  repositories: RentPaymentRepositories,
  input: EnsureInstallmentsInput,
  deps: { clock: Clock; idGenerator: IdGenerator },
): RentInstallment[] {
  const agreement = repositories.agreements.findById(input.agreementId);
  if (agreement === null) {
    throw new RentAgreementNotFoundError(input.agreementId);
  }

  const upperBound = resolveGenerationUpperBound({
    effectiveEndDate: agreement.effectiveEndDate,
    today: deps.clock.today(),
    requestedTo: input.to,
  });
  const from = input.from ?? agreement.firstRentDueDate;

  if (compareCalendarDates(from, upperBound) <= 0) {
    const planned = planInstallments({
      anchor: agreement.firstRentDueDate,
      frequency: agreement.rentFrequency,
      amount: agreement.rentAmount,
      from,
      to: upperBound,
    });
    const existing = repositories.installments.findByAgreementWindow(
      agreement.id,
      from,
      upperBound,
    );
    const existingDueDates = new Set(existing.map((installment) => installment.dueDate));
    for (const missing of planned) {
      if (existingDueDates.has(missing.dueDate)) {
        continue;
      }
      repositories.installments.save(
        RentInstallment.create({
          id: deps.idGenerator.next(),
          agreementId: agreement.id,
          dueDate: missing.dueDate,
          periodIndex: missing.periodIndex,
          amount: missing.amount,
          createdAt: deps.clock.now(),
        }),
      );
    }
  }

  return repositories.installments.findByAgreementWindow(agreement.id, from, upperBound);
}
