import { allocatePayment, totalOutstanding } from './payment-allocation';

describe('allocatePayment', () => {
  const obligations = [
    { installmentId: 'i-3', dueDate: '2026-03-01', remainingAmount: 50_000 },
    { installmentId: 'i-1', dueDate: '2026-01-01', remainingAmount: 50_000 },
    { installmentId: 'i-2', dueDate: '2026-02-01', remainingAmount: 50_000 },
  ];

  it('spreads the payment oldest-first across outstanding periods', () => {
    expect(allocatePayment(obligations, 120_000)).toEqual([
      { installmentId: 'i-1', amount: 50_000 },
      { installmentId: 'i-2', amount: 50_000 },
      { installmentId: 'i-3', amount: 20_000 },
    ]);
  });

  it('applies a partial payment to the oldest period only', () => {
    expect(allocatePayment(obligations, 30_000)).toEqual([{ installmentId: 'i-1', amount: 30_000 }]);
  });

  it('ignores periods that are already settled', () => {
    const settled = [
      { installmentId: 'i-1', dueDate: '2026-01-01', remainingAmount: 0 },
      { installmentId: 'i-2', dueDate: '2026-02-01', remainingAmount: 50_000 },
    ];
    expect(allocatePayment(settled, 10_000)).toEqual([{ installmentId: 'i-2', amount: 10_000 }]);
  });

  it('returns no allocations when the payment exceeds the outstanding balance', () => {
    expect(allocatePayment(obligations, 200_000)).toEqual([]);
  });

  it('returns no allocations for a non-positive amount', () => {
    expect(allocatePayment(obligations, 0)).toEqual([]);
    expect(allocatePayment(obligations, -5)).toEqual([]);
  });
});

describe('totalOutstanding', () => {
  it('sums the positive remaining balances', () => {
    expect(
      totalOutstanding([
        { installmentId: 'i-1', dueDate: '2026-01-01', remainingAmount: 50_000 },
        { installmentId: 'i-2', dueDate: '2026-02-01', remainingAmount: 0 },
        { installmentId: 'i-3', dueDate: '2026-03-01', remainingAmount: 20_000 },
      ]),
    ).toBe(70_000);
  });
});
