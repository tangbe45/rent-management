import { compareCalendarDates, type CalendarDateString } from '../../../shared/domain/calendar-date';

export interface AllocatableObligation {
  installmentId: string;
  dueDate: CalendarDateString;
  remainingAmount: number;
}

export interface PlannedAllocation {
  installmentId: string;
  amount: number;
}

/**
 * Spreads a payment oldest-first across the remaining balances of an
 * agreement's rent periods, producing the exact allocations the application
 * layer expects. The last affected period receives only the remainder, so the
 * allocations always add up to the payment amount. Returns `[]` for a
 * non-positive amount or when nothing is outstanding.
 */
export function allocatePayment(
  obligations: readonly AllocatableObligation[],
  amount: number,
): PlannedAllocation[] {
  if (!Number.isInteger(amount) || amount <= 0) {
    return [];
  }
  const ordered = [...obligations]
    .filter((obligation) => obligation.remainingAmount > 0)
    .sort((a, b) => compareCalendarDates(a.dueDate, b.dueDate));

  const allocations: PlannedAllocation[] = [];
  let remainingToAllocate = amount;
  for (const obligation of ordered) {
    if (remainingToAllocate <= 0) {
      break;
    }
    const applied = Math.min(remainingToAllocate, obligation.remainingAmount);
    allocations.push({ installmentId: obligation.installmentId, amount: applied });
    remainingToAllocate -= applied;
  }
  if (remainingToAllocate > 0) {
    return [];
  }
  return allocations;
}

/** Total still owed across the given obligations. */
export function totalOutstanding(obligations: readonly AllocatableObligation[]): number {
  return obligations.reduce((total, obligation) => total + Math.max(0, obligation.remainingAmount), 0);
}
