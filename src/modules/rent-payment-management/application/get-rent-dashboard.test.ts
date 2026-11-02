import { EnsureInstallments } from './ensure-installments';
import { GetRentDashboard } from './get-rent-dashboard';
import { RecordRentPayment } from './record-rent-payment';
import { ReverseRentPayment } from './reverse-rent-payment';
import { agreementRef, first, paymentTestHarness, type PaymentTestHarness } from './test-support';

function dashboard(harness: PaymentTestHarness) {
  return new GetRentDashboard({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  }).execute();
}

function buildHarness(): PaymentTestHarness {
  return paymentTestHarness({
    agreements: [
      agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-03-31' }),
      agreementRef({
        id: 'agreement-2',
        tenantId: 'tenant-2',
        spaceId: 'space-2',
        firstRentDueDate: '2027-01-01',
        startDate: '2027-01-01',
        effectiveEndDate: '2027-12-31',
      }),
    ],
  });
}

describe('GetRentDashboard', () => {
  it('summarizes overdue and due-now without double counting', () => {
    const harness = buildHarness();
    const summary = dashboard(harness);
    expect(summary.totalOverdue).toBe(150_000);
    expect(summary.totalDueNow).toBe(150_000);
    expect(summary.totalCollectedThisMonth).toBe(0);
    expect(summary.attentionItems).toHaveLength(3);
    expect(summary.attentionItems.map((item) => item.status)).toEqual([
      'OVERDUE',
      'OVERDUE',
      'OVERDUE',
    ]);
  });

  it('counts collected money for the current calendar month and excludes reversed payments', () => {
    const harness = buildHarness();
    const firstInstallment = first(
      new EnsureInstallments({
        unitOfWork: harness.unitOfWork,
        clock: harness.clock,
        idGenerator: harness.idGenerator,
      }).execute({ agreementId: 'agreement-1' }),
    );

    const payment = new RecordRentPayment({
      unitOfWork: harness.unitOfWork,
      clock: harness.clock,
      idGenerator: harness.idGenerator,
      subscriptionAccess: harness.entitlement,
    }).execute({
      agreementId: 'agreement-1',
      amount: 30_000,
      paymentDate: '2026-10-09',
      method: 'CASH',
      allocations: [{ installmentId: firstInstallment.id, amount: 30_000 }],
    });

    const afterPayment = dashboard(harness);
    expect(afterPayment.totalCollectedThisMonth).toBe(30_000);
    expect(afterPayment.totalOverdue).toBe(120_000);

    new ReverseRentPayment({
      unitOfWork: harness.unitOfWork,
      clock: harness.clock,
    }).execute({ paymentId: payment.id, reason: 'WRONG_AMOUNT' });

    const afterReversal = dashboard(harness);
    expect(afterReversal.totalCollectedThisMonth).toBe(0);
    expect(afterReversal.totalOverdue).toBe(150_000);
  });

  it('ignores an agreement whose first due date is in the future', () => {
    const harness = buildHarness();
    const summary = dashboard(harness);
    expect(summary.attentionItems.every((item) => item.agreementId === 'agreement-1')).toBe(true);
  });
});
