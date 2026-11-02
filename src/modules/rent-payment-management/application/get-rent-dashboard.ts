import {
  compareCalendarDates,
  formatCalendarDate,
  parseCalendarDate,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { ensureInstallments } from './installment-generation';
import { buildObligationRows } from './rent-obligations';
import type { RentPaymentUnitOfWork } from './rent-payment-unit-of-work';

export interface RentAttentionItem {
  agreementId: string;
  tenantId: string;
  spaceId: string;
  installmentId: string;
  dueDate: CalendarDateString;
  remainingAmount: number;
  status: 'DUE' | 'OVERDUE';
}

export interface RentDashboard {
  totalOverdue: number;
  totalDueNow: number;
  totalCollectedThisMonth: number;
  attentionItems: RentAttentionItem[];
}

function monthBounds(today: CalendarDateString): { start: CalendarDateString; end: CalendarDateString } {
  const parsed = parseCalendarDate(today);
  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth();
  const start = formatCalendarDate(new Date(Date.UTC(year, month, 1)));
  const end = formatCalendarDate(new Date(Date.UTC(year, month + 1, 0)));
  return { start, end };
}

/**
 * The rent dashboard: total overdue, total due now (which includes overdue), the
 * money collected in the current calendar month (reversed payments excluded) and
 * the unpaid due/overdue obligations that need attention. It materializes the
 * due and overdue obligations for every agreement (a viewing window) so a
 * landlord never has to open each agreement first.
 */
export class GetRentDashboard {
  constructor(
    private readonly deps: {
      unitOfWork: RentPaymentUnitOfWork;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(): RentDashboard {
    const today = this.deps.clock.today();
    return this.deps.unitOfWork.run((repositories) => {
      const agreements = repositories.agreements.findAll();
      const attentionItems: RentAttentionItem[] = [];
      let totalOverdue = 0;
      let totalDueNow = 0;

      for (const agreement of agreements) {
        const installments = ensureInstallments(
          repositories,
          { agreementId: agreement.id, to: today },
          this.deps,
        );
        const rows = buildObligationRows(repositories, installments, today);
        for (const row of rows) {
          if (row.remainingAmount <= 0) {
            continue;
          }
          if (row.status !== 'OVERDUE' && row.status !== 'DUE') {
            continue;
          }
          totalDueNow += row.remainingAmount;
          if (row.status === 'OVERDUE') {
            totalOverdue += row.remainingAmount;
          }
          attentionItems.push({
            agreementId: agreement.id,
            tenantId: agreement.tenantId,
            spaceId: agreement.spaceId,
            installmentId: row.installment.id,
            dueDate: row.installment.dueDate,
            remainingAmount: row.remainingAmount,
            status: row.status,
          });
        }
      }

      attentionItems.sort((a, b) => compareCalendarDates(a.dueDate, b.dueDate));

      const { start, end } = monthBounds(today);
      const payments = repositories.payments.findAll({ fromDate: start, toDate: end });
      const reversedPaymentIds = new Set(
        repositories.payments
          .findReversalsByPaymentIds(payments.map((payment) => payment.id))
          .map((reversal) => reversal.paymentId),
      );
      let totalCollectedThisMonth = 0;
      for (const payment of payments) {
        if (!reversedPaymentIds.has(payment.id)) {
          totalCollectedThisMonth += payment.amount;
        }
      }

      return { totalOverdue, totalDueNow, totalCollectedThisMonth, attentionItems };
    });
  }
}
