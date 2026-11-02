import {
  compareCalendarDates,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { RentalAgreement } from '../domain/rental-agreement';
import type { RentalAgreementRepository } from '../domain/rental-agreement-repository';
import {
  addCalendarMonths,
  calculateRentSchedule,
  firstRentDueDateOnOrAfter,
} from '../domain/rent-schedule';
import { RentalAgreementNotFoundError } from './rental-agreement-errors';

export interface RentScheduleView {
  agreement: RentalAgreement;
  dueDates: CalendarDateString[];
  nextDueDate: CalendarDateString | null;
}

/**
 * How far ahead open-ended agreements are projected. An agreement with no
 * predetermined end has no final due date, so a rolling horizon keeps the list
 * finite and useful.
 */
export const RENT_SCHEDULE_HORIZON_MONTHS = 12;

export class GetRentSchedule {
  constructor(
    private readonly deps: {
      agreements: RentalAgreementRepository;
      clock: Clock;
    },
  ) {}

  execute(id: string): RentScheduleView {
    const agreement = this.deps.agreements.findById(id);
    if (agreement === null) {
      throw new RentalAgreementNotFoundError(id);
    }
    const today = this.deps.clock.today();
    const effectiveEndDate = agreement.effectiveEndDate;
    const horizon = addCalendarMonths(today, RENT_SCHEDULE_HORIZON_MONTHS);
    const lastDate =
      effectiveEndDate === null
        ? horizon
        : compareCalendarDates(effectiveEndDate, horizon) <= 0
          ? effectiveEndDate
          : horizon;

    const dueDates = calculateRentSchedule(
      agreement.firstRentDueDate,
      agreement.rentFrequency,
      lastDate,
    );
    const next = firstRentDueDateOnOrAfter(
      agreement.firstRentDueDate,
      agreement.rentFrequency,
      today,
    );
    const nextDueDate =
      effectiveEndDate !== null && compareCalendarDates(next, effectiveEndDate) > 0 ? null : next;

    return { agreement, dueDates, nextDueDate };
  }
}
