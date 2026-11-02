import {
  compareCalendarDates,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { ensureInstallments } from './installment-generation';
import type { RentAgreementReference } from './rental-agreement-lookup';
import { buildObligationRows, type RentObligationRow } from './rent-obligations';
import type { RentPaymentRepositories, RentPaymentUnitOfWork } from './rent-payment-unit-of-work';

export interface RentAgreementSummary {
  agreement: RentAgreementReference;
  totalOutstanding: number;
  overdue: number;
  dueNow: number;
  nextDueDate: CalendarDateString | null;
  obligations: RentObligationRow[];
}

/**
 * The rent picture for a tenant: one summary per agreement (so two agreements
 * never mix their allocations), each with its outstanding, overdue and due-now
 * totals and its obligations from oldest to newest.
 */
export class GetRentSummary {
  constructor(
    private readonly deps: {
      unitOfWork: RentPaymentUnitOfWork;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: { tenantId: string }): RentAgreementSummary[] {
    const today = this.deps.clock.today();
    return this.deps.unitOfWork.run((repositories) => {
      const agreements = repositories.agreements.findByTenantId(input.tenantId);
      return agreements.map((agreement) =>
        summarizeAgreement(repositories, agreement, today, this.deps),
      );
    });
  }
}

export function summarizeAgreement(
  repositories: RentPaymentRepositories,
  agreement: RentAgreementReference,
  today: CalendarDateString,
  deps: { clock: Clock; idGenerator: IdGenerator },
): RentAgreementSummary {
  const installments = ensureInstallments(repositories, { agreementId: agreement.id }, deps);
  const obligations = buildObligationRows(repositories, installments, today);

  let totalOutstanding = 0;
  let overdue = 0;
  let dueNow = 0;
  let nextDueDate: CalendarDateString | null = null;
  for (const row of obligations) {
    totalOutstanding += row.remainingAmount;
    if (row.status === 'OVERDUE') {
      overdue += row.remainingAmount;
    }
    if (row.status === 'OVERDUE' || row.status === 'DUE') {
      dueNow += row.remainingAmount;
    }
    if (
      row.remainingAmount > 0 &&
      (nextDueDate === null || compareCalendarDates(row.installment.dueDate, nextDueDate) < 0)
    ) {
      nextDueDate = row.installment.dueDate;
    }
  }

  return { agreement, totalOutstanding, overdue, dueNow, nextDueDate, obligations };
}
