import { addCalendarMonths, calculateRentSchedule, firstRentDueDateOnOrAfter } from './rent-schedule';

describe('addCalendarMonths', () => {
  it('clamps to the last day of a shorter target month', () => {
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addCalendarMonths('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('handles leap years', () => {
    expect(addCalendarMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addCalendarMonths('2024-02-29', 12)).toBe('2025-02-28');
  });

  it('rolls over year boundaries', () => {
    expect(addCalendarMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addCalendarMonths('2026-01-15', -1)).toBe('2025-12-15');
  });
});

describe('calculateRentSchedule', () => {
  it('advances each occurrence from the original anchor (monthly on the 31st)', () => {
    expect(calculateRentSchedule('2026-01-31', 'MONTHLY', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('supports every frequency interval', () => {
    expect(calculateRentSchedule('2026-01-15', 'MONTHLY', '2026-04-15')).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
    expect(calculateRentSchedule('2026-01-15', 'QUARTERLY', '2026-12-15')).toEqual([
      '2026-01-15',
      '2026-04-15',
      '2026-07-15',
      '2026-10-15',
    ]);
    expect(calculateRentSchedule('2026-01-15', 'HALF_YEARLY', '2026-12-15')).toEqual([
      '2026-01-15',
      '2026-07-15',
    ]);
    expect(calculateRentSchedule('2026-01-15', 'YEARLY', '2028-01-15')).toEqual([
      '2026-01-15',
      '2027-01-15',
      '2028-01-15',
    ]);
  });

  it('stops after the effective end date (inclusive)', () => {
    expect(calculateRentSchedule('2026-01-01', 'MONTHLY', '2026-03-15')).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
    ]);
  });

  it('returns an empty schedule when the end is before the anchor', () => {
    expect(calculateRentSchedule('2026-05-01', 'MONTHLY', '2026-01-01')).toEqual([]);
  });
});

describe('firstRentDueDateOnOrAfter', () => {
  it('returns the anchor when it is on or after the date', () => {
    expect(firstRentDueDateOnOrAfter('2026-03-01', 'MONTHLY', '2026-01-01')).toBe('2026-03-01');
  });

  it('advances to the next occurrence', () => {
    expect(firstRentDueDateOnOrAfter('2026-01-31', 'MONTHLY', '2026-03-01')).toBe('2026-03-31');
    expect(firstRentDueDateOnOrAfter('2026-01-15', 'QUARTERLY', '2026-05-01')).toBe('2026-07-15');
  });
});
