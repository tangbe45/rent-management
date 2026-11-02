import type { CalendarDateString } from '../../../shared/domain/calendar-date';
import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { SubscriptionExpiredError } from '../../subscription/application/errors';
import { RentPaymentAllocation } from '../domain/allocation';
import { RentInstallment } from '../domain/installment';
import { RentPayment, type PaymentMethod } from '../domain/payment';
import { RentPaymentReversal } from '../domain/payment-reversal';
import type {
  RentInstallmentRepository,
  RentPaymentFilter,
  RentPaymentRepository,
} from '../domain/rent-payment-repository';
import type { RecordPaymentEntitlement } from './record-rent-payment';
import type {
  RentAgreementReference,
  RentalAgreementLookup,
} from './rental-agreement-lookup';
import type {
  RentPaymentRepositories,
  RentPaymentUnitOfWork,
} from './rent-payment-unit-of-work';

function compareDates(a: CalendarDateString, b: CalendarDateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export class InMemoryRentInstallmentRepository implements RentInstallmentRepository {
  private readonly store = new Map<string, RentInstallment>();

  save(installment: RentInstallment): void {
    this.store.set(installment.id, installment);
  }

  findById(id: string): RentInstallment | null {
    return this.store.get(id) ?? null;
  }

  findByIds(ids: readonly string[]): RentInstallment[] {
    return ids
      .map((id) => this.store.get(id))
      .filter((installment): installment is RentInstallment => installment !== undefined);
  }

  findByAgreementId(agreementId: string): RentInstallment[] {
    return [...this.store.values()]
      .filter((installment) => installment.agreementId === agreementId)
      .sort((a, b) => compareDates(a.dueDate, b.dueDate));
  }

  findByAgreementWindow(
    agreementId: string,
    from: CalendarDateString,
    to: CalendarDateString,
  ): RentInstallment[] {
    return this.findByAgreementId(agreementId).filter(
      (installment) =>
        compareDates(installment.dueDate, from) >= 0 && compareDates(installment.dueDate, to) <= 0,
    );
  }

  deleteByAgreement(agreementId: string): void {
    for (const [id, installment] of this.store) {
      if (installment.agreementId === agreementId) {
        this.store.delete(id);
      }
    }
  }

  get all(): RentInstallment[] {
    return [...this.store.values()];
  }
}

export class InMemoryRentPaymentRepository implements RentPaymentRepository {
  private readonly payments = new Map<string, RentPayment>();
  private readonly allocations = new Map<string, RentPaymentAllocation>();
  private readonly reversals = new Map<string, RentPaymentReversal>();

  save(payment: RentPayment): void {
    this.payments.set(payment.id, payment);
  }

  findById(id: string): RentPayment | null {
    return this.payments.get(id) ?? null;
  }

  findAll(filter: RentPaymentFilter = {}): RentPayment[] {
    return [...this.payments.values()].filter((payment) => {
      if (filter.agreementId !== undefined && payment.agreementId !== filter.agreementId) {
        return false;
      }
      if (filter.agreementIds !== undefined && !filter.agreementIds.includes(payment.agreementId)) {
        return false;
      }
      if (filter.methods !== undefined && !filter.methods.includes(payment.method)) {
        return false;
      }
      if (filter.fromDate !== undefined && compareDates(payment.paymentDate, filter.fromDate) < 0) {
        return false;
      }
      if (filter.toDate !== undefined && compareDates(payment.paymentDate, filter.toDate) > 0) {
        return false;
      }
      return true;
    });
  }

  saveAllocations(allocations: readonly RentPaymentAllocation[]): void {
    for (const allocation of allocations) {
      this.allocations.set(allocation.id, allocation);
    }
  }

  findAllocationsByPaymentId(paymentId: string): RentPaymentAllocation[] {
    return this.findAllocationsByPaymentIds([paymentId]);
  }

  findAllocationsByPaymentIds(paymentIds: readonly string[]): RentPaymentAllocation[] {
    const ids = new Set(paymentIds);
    return [...this.allocations.values()].filter((allocation) => ids.has(allocation.paymentId));
  }

  findAllocationsByInstallmentIds(installmentIds: readonly string[]): RentPaymentAllocation[] {
    const ids = new Set(installmentIds);
    return [...this.allocations.values()].filter((allocation) =>
      ids.has(allocation.installmentId),
    );
  }

  saveReversal(reversal: RentPaymentReversal): void {
    this.reversals.set(reversal.paymentId, reversal);
  }

  findReversalByPaymentId(paymentId: string): RentPaymentReversal | null {
    return this.reversals.get(paymentId) ?? null;
  }

  findReversalsByPaymentIds(paymentIds: readonly string[]): RentPaymentReversal[] {
    const ids = new Set(paymentIds);
    return [...this.reversals.values()].filter((reversal) => ids.has(reversal.paymentId));
  }
}

export class InMemoryRentalAgreementLookup implements RentalAgreementLookup {
  private readonly store = new Map<string, RentAgreementReference>();

  constructor(agreements: RentAgreementReference[] = []) {
    for (const agreement of agreements) {
      this.store.set(agreement.id, agreement);
    }
  }

  add(agreement: RentAgreementReference): void {
    this.store.set(agreement.id, agreement);
  }

  findById(id: string): RentAgreementReference | null {
    return this.store.get(id) ?? null;
  }

  findByTenantId(tenantId: string): RentAgreementReference[] {
    return [...this.store.values()].filter((agreement) => agreement.tenantId === tenantId);
  }

  findAll(): RentAgreementReference[] {
    return [...this.store.values()];
  }
}

export class InMemoryRentPaymentUnitOfWork implements RentPaymentUnitOfWork {
  constructor(private readonly repositories: RentPaymentRepositories) {}

  run<T>(work: (repositories: RentPaymentRepositories) => T): T {
    return work(this.repositories);
  }
}

export class FakeRentPaymentClock implements Clock {
  constructor(
    private current = 1000,
    private currentDate = '2026-10-09',
  ) {}

  today(): CalendarDateString {
    return this.currentDate;
  }

  now(): number {
    return this.current;
  }

  setNow(value: number): void {
    this.current = value;
  }

  setToday(value: CalendarDateString): void {
    this.currentDate = value;
  }
}

export class SequentialRentPaymentIdGenerator implements IdGenerator {
  private count = 0;

  constructor(private readonly prefix = 'id') {}

  next(): string {
    this.count += 1;
    return `${this.prefix}-${this.count}`;
  }
}

export class StubPaymentEntitlement implements RecordPaymentEntitlement {
  constructor(private active = true) {}

  setActive(active: boolean): void {
    this.active = active;
  }

  assertCanRecordRentalPayment(): void {
    if (!this.active) {
      throw new SubscriptionExpiredError();
    }
  }
}

export interface PaymentTestHarness {
  installments: InMemoryRentInstallmentRepository;
  payments: InMemoryRentPaymentRepository;
  agreements: InMemoryRentalAgreementLookup;
  unitOfWork: RentPaymentUnitOfWork;
  clock: FakeRentPaymentClock;
  idGenerator: SequentialRentPaymentIdGenerator;
  entitlement: StubPaymentEntitlement;
}

export function paymentTestHarness(
  options: {
    agreements?: RentAgreementReference[];
    today?: CalendarDateString;
    now?: number;
    active?: boolean;
  } = {},
): PaymentTestHarness {
  const installments = new InMemoryRentInstallmentRepository();
  const payments = new InMemoryRentPaymentRepository();
  const agreements = new InMemoryRentalAgreementLookup(options.agreements ?? []);
  const unitOfWork = new InMemoryRentPaymentUnitOfWork({ installments, payments, agreements });
  const clock = new FakeRentPaymentClock(options.now ?? 1000, options.today ?? '2026-10-09');
  const idGenerator = new SequentialRentPaymentIdGenerator();
  const entitlement = new StubPaymentEntitlement(options.active ?? true);
  return { installments, payments, agreements, unitOfWork, clock, idGenerator, entitlement };
}

export function agreementRef(
  overrides: Partial<RentAgreementReference> & { id: string },
): RentAgreementReference {
  return {
    tenantId: 'tenant-1',
    spaceId: 'space-1',
    rentAmount: 50_000,
    rentFrequency: 'MONTHLY',
    firstRentDueDate: '2026-01-01',
    startDate: '2026-01-01',
    effectiveEndDate: null,
    ...overrides,
  };
}

export function paymentMethod(value: PaymentMethod): PaymentMethod {
  return value;
}

/** Test helper: read an item that must exist, failing loudly otherwise. */
export function at<T>(items: readonly T[], index: number): T {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`Expected an item at index ${index}.`);
  }
  return value;
}

export function first<T>(items: readonly T[]): T {
  return at(items, 0);
}
