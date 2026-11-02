import {
  compareCalendarDates,
  isValidCalendarDate,
  type CalendarDateString,
} from '../../../shared/domain/calendar-date';

export const RENTAL_AGREEMENT_NOTES_MAX_LENGTH = 1000;

/**
 * How often rent is charged. The stored `rentAmount` is always the amount the
 * landlord entered for the selected frequency, never a monthly base amount that
 * gets multiplied or divided.
 */
export const RENT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as const;

export type RentFrequency = (typeof RENT_FREQUENCIES)[number];

export const RENT_FREQUENCY_MONTHS: Record<RentFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

export function isRentFrequency(value: string): value is RentFrequency {
  return (RENT_FREQUENCIES as readonly string[]).includes(value);
}

/**
 * Derived lifecycle. It is never persisted: it is recalculated from the
 * agreement dates and the current calendar date.
 *
 * A recorded termination takes precedence, so an agreement with a future start
 * date but a recorded termination is TERMINATED rather than UPCOMING. This keeps
 * the rule simple and matches the conflict-prevention logic, which treats any
 * recorded termination as an effective end date.
 */
export type RentalAgreementLifecycle = 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'TERMINATED';

export interface RentalAgreementData {
  id: string;
  tenantId: string;
  spaceId: string;
  startDate: CalendarDateString;
  endDate: CalendarDateString | null;
  terminationDate: CalendarDateString | null;
  rentAmount: number;
  rentFrequency: RentFrequency;
  firstRentDueDate: CalendarDateString;
  securityDepositAmount: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RentalAgreementTerms {
  tenantId: string;
  spaceId: string;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
  firstRentDueDate: string;
  securityDepositAmount?: number | null;
  notes?: string | null;
}

function requireDate(value: string, field: string): CalendarDateString {
  const date = value.trim();
  if (!isValidCalendarDate(date)) {
    throw new InvalidRentalAgreementDateError(field);
  }
  return date;
}

function normalizeOptionalDate(value: string | null | undefined, field: string): CalendarDateString | null {
  if (value === null || value === undefined) {
    return null;
  }
  const date = value.trim();
  if (date.length === 0) {
    return null;
  }
  if (!isValidCalendarDate(date)) {
    throw new InvalidRentalAgreementDateError(field);
  }
  return date;
}

/**
 * Money is stored as integer minor units (for example cents) to avoid
 * floating-point arithmetic. The MVP stores a single implicit currency; there is
 * no currency column yet (the Settings slice will own the currency later).
 */
export function isValidMinorAmount(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function normalizeRentAmount(value: number): number {
  if (!isValidMinorAmount(value)) {
    throw new InvalidRentalAgreementRentAmountError();
  }
  return value;
}

function normalizeDeposit(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isValidMinorAmount(value)) {
    throw new InvalidRentalAgreementSecurityDepositError();
  }
  return value;
}

function normalizeFrequency(value: string): RentFrequency {
  if (!isRentFrequency(value)) {
    throw new InvalidRentalAgreementRentFrequencyError(value);
  }
  return value;
}

function normalizeNotes(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const notes = value.trim();
  if (notes.length === 0) {
    return null;
  }
  if (notes.length > RENTAL_AGREEMENT_NOTES_MAX_LENGTH) {
    throw new InvalidRentalAgreementNotesError(
      `Notes must be at most ${RENTAL_AGREEMENT_NOTES_MAX_LENGTH} characters.`,
    );
  }
  return notes;
}

function validateTerms(terms: {
  startDate: CalendarDateString;
  endDate: CalendarDateString | null;
  firstRentDueDate: CalendarDateString;
}): void {
  if (terms.endDate !== null && compareCalendarDates(terms.endDate, terms.startDate) < 0) {
    throw new InvalidRentalAgreementEndDateError('The end date must be on or after the start date.');
  }
  if (
    terms.endDate !== null &&
    compareCalendarDates(terms.firstRentDueDate, terms.endDate) > 0
  ) {
    throw new InvalidRentalAgreementFirstRentDueDateError(
      'The first rent due date must be on or before the agreement end date.',
    );
  }
}

/**
 * A Rental Agreement binds a Tenant to a rentable Property Space for a period.
 * The property is derived through the space and is never stored here. Lifecycle
 * is derived from the dates and the current date; there is deliberately no
 * stored status. Termination preserves the original `endDate` and records an
 * earlier `terminationDate`.
 */
export class RentalAgreement {
  private constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly spaceId: string,
    readonly startDate: CalendarDateString,
    readonly endDate: CalendarDateString | null,
    readonly terminationDate: CalendarDateString | null,
    readonly rentAmount: number,
    readonly rentFrequency: RentFrequency,
    readonly firstRentDueDate: CalendarDateString,
    readonly securityDepositAmount: number | null,
    readonly notes: string | null,
    readonly createdAt: number,
    readonly updatedAt: number,
  ) {}

  static create(
    input: RentalAgreementTerms & { id: string; createdAt: number },
  ): RentalAgreement {
    const startDate = requireDate(input.startDate, 'Start date');
    const endDate = normalizeOptionalDate(input.endDate, 'End date');
    const firstRentDueDate = requireDate(input.firstRentDueDate, 'First rent due date');
    validateTerms({ startDate, endDate, firstRentDueDate });
    return new RentalAgreement(
      input.id,
      input.tenantId,
      input.spaceId,
      startDate,
      endDate,
      null,
      normalizeRentAmount(input.rentAmount),
      normalizeFrequency(input.rentFrequency),
      firstRentDueDate,
      normalizeDeposit(input.securityDepositAmount),
      normalizeNotes(input.notes),
      input.createdAt,
      input.createdAt,
    );
  }

  static hydrate(data: RentalAgreementData): RentalAgreement {
    return new RentalAgreement(
      data.id,
      data.tenantId,
      data.spaceId,
      requireDate(data.startDate, 'Start date'),
      normalizeOptionalDate(data.endDate, 'End date'),
      normalizeOptionalDate(data.terminationDate, 'Termination date'),
      normalizeRentAmount(data.rentAmount),
      normalizeFrequency(data.rentFrequency),
      requireDate(data.firstRentDueDate, 'First rent due date'),
      normalizeDeposit(data.securityDepositAmount),
      normalizeNotes(data.notes),
      data.createdAt,
      data.updatedAt,
    );
  }

  get effectiveEndDate(): CalendarDateString | null {
    return this.terminationDate ?? this.endDate;
  }

  get isTerminated(): boolean {
    return this.terminationDate !== null;
  }

  lifecycleOn(today: CalendarDateString): RentalAgreementLifecycle {
    if (this.terminationDate !== null) {
      return 'TERMINATED';
    }
    if (compareCalendarDates(today, this.startDate) < 0) {
      return 'UPCOMING';
    }
    if (this.endDate !== null && compareCalendarDates(today, this.endDate) > 0) {
      return 'ENDED';
    }
    return 'ACTIVE';
  }

  hasStartedOn(today: CalendarDateString): boolean {
    return compareCalendarDates(today, this.startDate) >= 0;
  }

  /**
   * Inclusive interval overlap against a candidate period. A `null` end date on
   * either side means "no predetermined end" (infinity). Both intervals are
   * inclusive of their boundaries, so a new agreement starting exactly on the
   * old agreement's end date still overlaps.
   */
  overlaps(input: {
    startDate: CalendarDateString;
    effectiveEndDate: CalendarDateString | null;
  }): boolean {
    const startsBeforeOtherEnd =
      input.effectiveEndDate === null ||
      compareCalendarDates(this.startDate, input.effectiveEndDate) <= 0;
    const otherStartsBeforeThisEnd =
      this.effectiveEndDate === null ||
      compareCalendarDates(input.startDate, this.effectiveEndDate) <= 0;
    return startsBeforeOtherEnd && otherStartsBeforeThisEnd;
  }

  /**
   * Whether this agreement currently or prospectively prevents archiving its
   * related tenant, property or space. Historical agreements whose effective end
   * has already passed do not block archiving.
   */
  blocksArchiveOn(today: CalendarDateString): boolean {
    const effectiveEndDate = this.effectiveEndDate;
    return effectiveEndDate === null || compareCalendarDates(effectiveEndDate, today) >= 0;
  }

  /**
   * Replaces the rental terms. Only legal before the agreement starts; the
   * application layer enforces the start-date lock. Identity, `createdAt` and a
   * recorded termination are preserved.
   */
  reviseTerms(input: RentalAgreementTerms & { updatedAt: number }): RentalAgreement {
    if (this.terminationDate !== null) {
      throw new RentalAgreementTerminatedError(this.id);
    }
    const startDate = requireDate(input.startDate, 'Start date');
    const endDate = normalizeOptionalDate(input.endDate, 'End date');
    const firstRentDueDate = requireDate(input.firstRentDueDate, 'First rent due date');
    validateTerms({ startDate, endDate, firstRentDueDate });
    return new RentalAgreement(
      this.id,
      input.tenantId,
      input.spaceId,
      startDate,
      endDate,
      this.terminationDate,
      normalizeRentAmount(input.rentAmount),
      normalizeFrequency(input.rentFrequency),
      firstRentDueDate,
      normalizeDeposit(input.securityDepositAmount),
      normalizeNotes(input.notes),
      this.createdAt,
      input.updatedAt,
    );
  }

  /** Administrative notes remain editable after the agreement has started. */
  updateNotes(notes: string | null | undefined, updatedAt: number): RentalAgreement {
    return new RentalAgreement(
      this.id,
      this.tenantId,
      this.spaceId,
      this.startDate,
      this.endDate,
      this.terminationDate,
      this.rentAmount,
      this.rentFrequency,
      this.firstRentDueDate,
      this.securityDepositAmount,
      normalizeNotes(notes),
      this.createdAt,
      updatedAt,
    );
  }

  /**
   * Records early termination. The original `endDate` is preserved. A
   * termination may be today, in the past (backdated) or in the future; it must
   * be on or after `startDate` and, when an `endDate` exists, strictly before it.
   */
  terminate(terminationDate: string, updatedAt: number): RentalAgreement {
    if (this.terminationDate !== null) {
      throw new RentalAgreementAlreadyTerminatedError(this.id);
    }
    const date = requireDate(terminationDate, 'Termination date');
    if (compareCalendarDates(date, this.startDate) < 0) {
      throw new InvalidRentalAgreementTerminationDateError(
        'The termination date must be on or after the start date.',
      );
    }
    if (this.endDate !== null && compareCalendarDates(date, this.endDate) >= 0) {
      throw new InvalidRentalAgreementTerminationDateError(
        'An early termination must be strictly before the agreement end date.',
      );
    }
    return new RentalAgreement(
      this.id,
      this.tenantId,
      this.spaceId,
      this.startDate,
      this.endDate,
      date,
      this.rentAmount,
      this.rentFrequency,
      this.firstRentDueDate,
      this.securityDepositAmount,
      this.notes,
      this.createdAt,
      updatedAt,
    );
  }
}

export class InvalidRentalAgreementDateError extends Error {
  constructor(field: string) {
    super(`${field} must be a valid calendar date (YYYY-MM-DD).`);
    this.name = 'InvalidRentalAgreementDateError';
  }
}

export class InvalidRentalAgreementEndDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRentalAgreementEndDateError';
  }
}

export class InvalidRentalAgreementFirstRentDueDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRentalAgreementFirstRentDueDateError';
  }
}

export class InvalidRentalAgreementTerminationDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRentalAgreementTerminationDateError';
  }
}

export class InvalidRentalAgreementRentAmountError extends Error {
  constructor() {
    super('The rent amount must be a positive integer expressed in minor units.');
    this.name = 'InvalidRentalAgreementRentAmountError';
  }
}

export class InvalidRentalAgreementSecurityDepositError extends Error {
  constructor() {
    super('The security deposit must be a positive integer expressed in minor units.');
    this.name = 'InvalidRentalAgreementSecurityDepositError';
  }
}

export class InvalidRentalAgreementRentFrequencyError extends Error {
  constructor(value: string) {
    super(`The rent frequency "${value}" is not supported.`);
    this.name = 'InvalidRentalAgreementRentFrequencyError';
  }
}

export class InvalidRentalAgreementNotesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRentalAgreementNotesError';
  }
}

export class RentalAgreementTerminatedError extends Error {
  constructor(id: string) {
    super(`Rental agreement "${id}" has been terminated and can no longer be edited.`);
    this.name = 'RentalAgreementTerminatedError';
  }
}

export class RentalAgreementAlreadyTerminatedError extends Error {
  constructor(id: string) {
    super(`Rental agreement "${id}" is already terminated.`);
    this.name = 'RentalAgreementAlreadyTerminatedError';
  }
}
