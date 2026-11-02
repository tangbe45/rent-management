import { EnsureInstallments } from './ensure-installments';
import { AgreementHasActivePaymentsError } from './errors';
import { RecordRentPayment } from './record-rent-payment';
import { ResetAgreementInstallments } from './reset-agreement-installments';
import { ReverseRentPayment } from './reverse-rent-payment';
import { agreementRef, first, paymentTestHarness, type PaymentTestHarness } from './test-support';

function reset(harness: PaymentTestHarness) {
  return new ResetAgreementInstallments({
    installments: harness.installments,
    payments: harness.payments,
  });
}

function record(harness: PaymentTestHarness, installmentId: string) {
  return new RecordRentPayment({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
    subscriptionAccess: harness.entitlement,
  }).execute({
    agreementId: 'agreement-1',
    amount: 50_000,
    paymentDate: '2026-10-09',
    method: 'CASH',
    allocations: [{ installmentId, amount: 50_000 }],
  });
}

describe('ResetAgreementInstallments', () => {
  it('blocks a term change while an active payment is allocated', () => {
    const harness = paymentTestHarness({
      agreements: [agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-03-31' })],
    });
    const firstInstallment = first(new EnsureInstallments({
      unitOfWork: harness.unitOfWork,
      clock: harness.clock,
      idGenerator: harness.idGenerator,
    }).execute({ agreementId: 'agreement-1' }));
    record(harness, firstInstallment.id);

    expect(() => reset(harness).resetForAgreement('agreement-1')).toThrow(
      AgreementHasActivePaymentsError,
    );
  });

  it('discards unallocated installments once payments are reversed, keeping payment history', () => {
    const harness = paymentTestHarness({
      agreements: [agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-03-31' })],
    });
    const firstInstallment = first(new EnsureInstallments({
      unitOfWork: harness.unitOfWork,
      clock: harness.clock,
      idGenerator: harness.idGenerator,
    }).execute({ agreementId: 'agreement-1' }));
    const payment = record(harness, firstInstallment.id);
    new ReverseRentPayment({ unitOfWork: harness.unitOfWork, clock: harness.clock }).execute({
      paymentId: payment.id,
      reason: 'WRONG_AMOUNT',
    });

    reset(harness).resetForAgreement('agreement-1');

    expect(harness.installments.findByAgreementId('agreement-1')).toHaveLength(0);
    expect(harness.payments.findAllocationsByPaymentId(payment.id)).toHaveLength(1);
    expect(harness.payments.findAll()).toHaveLength(1);
  });
});
