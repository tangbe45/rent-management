import { GetAgreementRent } from './get-agreement-rent';
import { agreementRef, paymentTestHarness } from './test-support';

function useCase(harness: ReturnType<typeof paymentTestHarness>) {
  return new GetAgreementRent({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  });
}

describe('GetAgreementRent', () => {
  it('summarizes one agreement by id', () => {
    const harness = paymentTestHarness({
      agreements: [agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-02-28' })],
    });
    const summary = useCase(harness).execute({ agreementId: 'agreement-1' });
    expect(summary?.agreement.id).toBe('agreement-1');
    expect(summary?.obligations).toHaveLength(2);
    expect(summary?.totalOutstanding).toBe(100_000);
  });

  it('returns null for an unknown agreement', () => {
    const harness = paymentTestHarness();
    expect(useCase(harness).execute({ agreementId: 'missing' })).toBeNull();
  });
});
