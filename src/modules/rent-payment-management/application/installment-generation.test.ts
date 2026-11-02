import { EnsureInstallments } from './ensure-installments';
import { agreementRef, paymentTestHarness } from './test-support';

function build(harness: ReturnType<typeof paymentTestHarness>) {
  return new EnsureInstallments({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  });
}

describe('EnsureInstallments', () => {
  it('generates monthly obligations up to a finite end date', () => {
    const harness = paymentTestHarness({
      agreements: [
        agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-04-15' }),
      ],
    });
    const installments = build(harness).execute({ agreementId: 'agreement-1' });

    expect(installments.map((installment) => installment.dueDate)).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
    ]);
    expect(installments.every((installment) => installment.amount === 50_000)).toBe(true);
    expect(installments.map((installment) => installment.periodIndex)).toEqual([0, 1, 2, 3]);
  });

  it('caps an open-ended agreement at the rolling horizon and never beyond', () => {
    const harness = paymentTestHarness({
      agreements: [agreementRef({ id: 'agreement-1', effectiveEndDate: null })],
    });
    const installments = build(harness).execute({ agreementId: 'agreement-1' });
    const last = installments[installments.length - 1];
    expect(last?.dueDate).toBe('2027-10-01');
    expect(installments.every((installment) => installment.dueDate <= '2027-10-09')).toBe(true);
  });

  it('is idempotent and preserves period identity on a second call', () => {
    const harness = paymentTestHarness({
      agreements: [
        agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-03-31' }),
      ],
    });
    const useCase = build(harness);
    const first = useCase.execute({ agreementId: 'agreement-1' });
    const second = useCase.execute({ agreementId: 'agreement-1' });

    expect(harness.installments.all).toHaveLength(3);
    expect(second.map((installment) => installment.id)).toEqual(
      first.map((installment) => installment.id),
    );
  });

  it('honours a narrower requested window without widening the end date', () => {
    const harness = paymentTestHarness({
      agreements: [
        agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-12-31' }),
      ],
    });
    const installments = build(harness).execute({
      agreementId: 'agreement-1',
      from: '2026-02-01',
      to: '2026-11-15',
    });
    expect(installments.map((installment) => installment.dueDate)).toEqual([
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
      '2026-11-01',
    ]);
  });

  it('keeps the anchor day without drift on shorter months', () => {
    const harness = paymentTestHarness({
      agreements: [
        agreementRef({
          id: 'agreement-1',
          firstRentDueDate: '2026-01-31',
          effectiveEndDate: '2026-04-30',
        }),
      ],
    });
    const installments = build(harness).execute({ agreementId: 'agreement-1' });
    expect(installments.map((installment) => installment.dueDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });
});
