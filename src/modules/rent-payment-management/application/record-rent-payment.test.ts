import { SubscriptionExpiredError } from '../../subscription/application/errors';
import { RentInstallment } from '../domain/installment';
import { EnsureInstallments } from './ensure-installments';
import {
  AllocationExceedsBalanceError,
  CrossAgreementAllocationError,
  DuplicateAllocationError,
  FutureRentPaymentDateError,
  PaymentAllocationMismatchError,
} from './errors';
import { ListRentObligations } from './rent-obligations';
import { RecordRentPayment } from './record-rent-payment';
import { agreementRef, at, first, paymentTestHarness, type PaymentTestHarness } from './test-support';

function ensure(harness: PaymentTestHarness, agreementId: string): RentInstallment[] {
  return new EnsureInstallments({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  }).execute({ agreementId });
}

function build(harness: PaymentTestHarness): RecordRentPayment {
  return new RecordRentPayment({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
    subscriptionAccess: harness.entitlement,
  });
}

function obligations(harness: PaymentTestHarness, agreementId: string) {
  return new ListRentObligations({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  }).execute({ agreementId });
}

function harnessWithInstallments(): PaymentTestHarness {
  const harness = paymentTestHarness({
    agreements: [
      agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-12-31' }),
    ],
  });
  ensure(harness, 'agreement-1');
  return harness;
}

describe('RecordRentPayment', () => {
  it('records a full payment and settles the installment', () => {
    const harness = harnessWithInstallments();
    const firstInstallment = first(harness.installments.findByAgreementId('agreement-1'));

    const payment = build(harness).execute({
      agreementId: 'agreement-1',
      amount: 50_000,
      paymentDate: '2026-10-09',
      method: 'CASH',
      allocations: [{ installmentId: firstInstallment.id, amount: 50_000 }],
    });

    expect(payment.amount).toBe(50_000);
    const row = obligations(harness, 'agreement-1').find(
      (candidate) => candidate.installment.id === firstInstallment.id,
    );
    expect(row?.status).toBe('PAID');
    expect(row?.paidAmount).toBe(50_000);
    expect(row?.remainingAmount).toBe(0);
    expect(harness.payments.findAllocationsByPaymentId(payment.id)).toHaveLength(1);
  });

  it('records a partial payment and leaves a remaining balance', () => {
    const harness = harnessWithInstallments();
    const firstInstallment = first(harness.installments.findByAgreementId('agreement-1'));

    build(harness).execute({
      agreementId: 'agreement-1',
      amount: 20_000,
      paymentDate: '2026-10-09',
      method: 'MOBILE_MONEY',
      reference: 'MOMO-1',
      allocations: [{ installmentId: firstInstallment.id, amount: 20_000 }],
    });

    const row = obligations(harness, 'agreement-1').find(
      (candidate) => candidate.installment.id === firstInstallment.id,
    );
    expect(row?.status).toBe('OVERDUE');
    expect(row?.paidAmount).toBe(20_000);
    expect(row?.remainingAmount).toBe(30_000);
  });

  it('applies one payment across multiple installments of the same agreement', () => {
    const harness = harnessWithInstallments();
    const all = harness.installments.findByAgreementId('agreement-1');

    const payment = build(harness).execute({
      agreementId: 'agreement-1',
      amount: 120_000,
      paymentDate: '2026-10-09',
      method: 'BANK_TRANSFER',
      allocations: [
        { installmentId: at(all, 0).id, amount: 50_000 },
        { installmentId: at(all, 1).id, amount: 50_000 },
        { installmentId: at(all, 2).id, amount: 20_000 },
      ],
    });

    expect(harness.payments.findAllocationsByPaymentId(payment.id)).toHaveLength(3);
  });

  it('rejects an allocation to another agreement even for the same tenant', () => {
    const harness = paymentTestHarness({
      agreements: [
        agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-12-31' }),
        agreementRef({
          id: 'agreement-2',
          spaceId: 'space-2',
          effectiveEndDate: '2026-12-31',
        }),
      ],
    });
    ensure(harness, 'agreement-1');
    ensure(harness, 'agreement-2');
    const other = first(harness.installments.findByAgreementId('agreement-2'));

    expect(() =>
      build(harness).execute({
        agreementId: 'agreement-1',
        amount: 50_000,
        paymentDate: '2026-10-09',
        method: 'CASH',
        allocations: [{ installmentId: other.id, amount: 50_000 }],
      }),
    ).toThrow(CrossAgreementAllocationError);
  });

  it('rejects a future payment date', () => {
    const harness = harnessWithInstallments();
    const firstInstallment = first(harness.installments.findByAgreementId('agreement-1'));
    expect(() =>
      build(harness).execute({
        agreementId: 'agreement-1',
        amount: 50_000,
        paymentDate: '2026-10-10',
        method: 'CASH',
        allocations: [{ installmentId: firstInstallment.id, amount: 50_000 }],
      }),
    ).toThrow(FutureRentPaymentDateError);
  });

  it('rejects an allocation greater than the installment remaining balance', () => {
    const harness = harnessWithInstallments();
    const firstInstallment = first(harness.installments.findByAgreementId('agreement-1'));
    expect(() =>
      build(harness).execute({
        agreementId: 'agreement-1',
        amount: 60_000,
        paymentDate: '2026-10-09',
        method: 'CASH',
        allocations: [{ installmentId: firstInstallment.id, amount: 60_000 }],
      }),
    ).toThrow(AllocationExceedsBalanceError);
  });

  it('rejects allocations that do not add up to the amount received', () => {
    const harness = harnessWithInstallments();
    const firstInstallment = first(harness.installments.findByAgreementId('agreement-1'));
    expect(() =>
      build(harness).execute({
        agreementId: 'agreement-1',
        amount: 50_000,
        paymentDate: '2026-10-09',
        method: 'CASH',
        allocations: [{ installmentId: firstInstallment.id, amount: 40_000 }],
      }),
    ).toThrow(PaymentAllocationMismatchError);
  });

  it('rejects applying the same rent period twice in one payment', () => {
    const harness = harnessWithInstallments();
    const firstInstallment = first(harness.installments.findByAgreementId('agreement-1'));
    expect(() =>
      build(harness).execute({
        agreementId: 'agreement-1',
        amount: 50_000,
        paymentDate: '2026-10-09',
        method: 'CASH',
        allocations: [
          { installmentId: firstInstallment.id, amount: 25_000 },
          { installmentId: firstInstallment.id, amount: 25_000 },
        ],
      }),
    ).toThrow(DuplicateAllocationError);
  });

  it('blocks recording when the subscription is not active', () => {
    const harness = harnessWithInstallments();
    harness.entitlement.setActive(false);
    const firstInstallment = first(harness.installments.findByAgreementId('agreement-1'));
    expect(() =>
      build(harness).execute({
        agreementId: 'agreement-1',
        amount: 50_000,
        paymentDate: '2026-10-09',
        method: 'CASH',
        allocations: [{ installmentId: firstInstallment.id, amount: 50_000 }],
      }),
    ).toThrow(SubscriptionExpiredError);
  });
});
