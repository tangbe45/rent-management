import { InvalidRentPaymentReversalError } from '../domain/payment-reversal';
import { EnsureInstallments } from './ensure-installments';
import { RentPaymentAlreadyReversedError } from './errors';
import { ListRentObligations } from './rent-obligations';
import { RecordRentPayment } from './record-rent-payment';
import { ReverseRentPayment } from './reverse-rent-payment';
import {
  agreementRef,
  first,
  paymentTestHarness,
  type PaymentTestHarness,
} from './test-support';

function setup(): { harness: PaymentTestHarness; paymentId: string; installmentId: string } {
  const harness = paymentTestHarness({
    agreements: [agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-12-31' })],
  });
  new EnsureInstallments({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  }).execute({ agreementId: 'agreement-1' });
  const installment = first(harness.installments.findByAgreementId('agreement-1'));

  const payment = new RecordRentPayment({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
    subscriptionAccess: harness.entitlement,
  }).execute({
    agreementId: 'agreement-1',
    amount: 50_000,
    paymentDate: '2026-10-09',
    method: 'CASH',
    allocations: [{ installmentId: installment.id, amount: 50_000 }],
  });

  return { harness, paymentId: payment.id, installmentId: installment.id };
}

function rows(harness: PaymentTestHarness) {
  return new ListRentObligations({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  }).execute({ agreementId: 'agreement-1' });
}

describe('ReverseRentPayment', () => {
  it('restores the installment balance and keeps the original payment', () => {
    const { harness, paymentId, installmentId } = setup();

    expect(rows(harness).find((row) => row.installment.id === installmentId)?.remainingAmount).toBe(
      0,
    );

    new ReverseRentPayment({
      unitOfWork: harness.unitOfWork,
      clock: harness.clock,
    }).execute({ paymentId, reason: 'WRONG_AMOUNT' });

    const restored = rows(harness).find((row) => row.installment.id === installmentId);
    expect(restored?.status).toBe('OVERDUE');
    expect(restored?.remainingAmount).toBe(50_000);
    expect(harness.payments.findAllocationsByPaymentId(paymentId)).toHaveLength(1);
  });

  it('requires an explanation when the reason is Other', () => {
    const { harness, paymentId } = setup();
    expect(() =>
      new ReverseRentPayment({
        unitOfWork: harness.unitOfWork,
        clock: harness.clock,
      }).execute({ paymentId, reason: 'OTHER' }),
    ).toThrow(InvalidRentPaymentReversalError);
  });

  it('refuses to reverse the same payment twice', () => {
    const { harness, paymentId } = setup();
    const useCase = new ReverseRentPayment({
      unitOfWork: harness.unitOfWork,
      clock: harness.clock,
    });
    useCase.execute({ paymentId, reason: 'DUPLICATE' });
    expect(() => useCase.execute({ paymentId, reason: 'DUPLICATE' })).toThrow(
      RentPaymentAlreadyReversedError,
    );
  });
});
