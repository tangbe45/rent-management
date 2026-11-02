import { GetRentSummary } from './get-rent-summary';
import { agreementRef, paymentTestHarness } from './test-support';

function summary(harness: ReturnType<typeof paymentTestHarness>, tenantId: string) {
  return new GetRentSummary({
    unitOfWork: harness.unitOfWork,
    clock: harness.clock,
    idGenerator: harness.idGenerator,
  }).execute({ tenantId });
}

describe('GetRentSummary', () => {
  it('keeps each agreement separate for the same tenant', () => {
    const harness = paymentTestHarness({
      agreements: [
        agreementRef({ id: 'agreement-1', effectiveEndDate: '2026-02-28' }),
        agreementRef({
          id: 'agreement-2',
          spaceId: 'space-2',
          startDate: '2026-06-01',
          firstRentDueDate: '2026-06-01',
          effectiveEndDate: '2026-06-30',
        }),
      ],
    });
    const summaries = summary(harness, 'tenant-1');
    expect(summaries).toHaveLength(2);
    const first = summaries.find((item) => item.agreement.id === 'agreement-1');
    const second = summaries.find((item) => item.agreement.id === 'agreement-2');
    expect(first?.obligations).toHaveLength(2);
    expect(second?.obligations).toHaveLength(1);
    expect(first?.totalOutstanding).toBe(100_000);
    expect(first?.nextDueDate).toBe('2026-01-01');
    expect(second?.nextDueDate).toBe('2026-06-01');
  });

  it('returns no summaries for a tenant without agreements', () => {
    const harness = paymentTestHarness({
      agreements: [agreementRef({ id: 'agreement-1' })],
    });
    expect(summary(harness, 'tenant-unknown')).toEqual([]);
  });
});
