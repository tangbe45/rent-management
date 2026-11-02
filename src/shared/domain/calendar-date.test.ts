import {
  addCalendarDays,
  compareCalendarDates,
  formatCalendarDate,
  isValidCalendarDate,
  parseCalendarDate,
  type CalendarDateString,
} from './calendar-date';

describe('calendar-date', () => {
  it('round-trips a valid calendar date', () => {
    expect(isValidCalendarDate('2026-10-08')).toBe(true);
    expect(formatCalendarDate(parseCalendarDate('2026-10-08'))).toBe('2026-10-08');
    expect(parseCalendarDate('2026-10-08').getUTCMonth()).toBe(9);
    expect(parseCalendarDate('2026-10-08').getUTCDate()).toBe(8);
  });

  it.each(['foo', '2026', '2026-13-01', '2026-00-10', '2026-02-30', '2026-1-1'])(
    'rejects invalid calendar date "%s"',
    (value) => {
      expect(isValidCalendarDate(value)).toBe(false);
      expect(() => parseCalendarDate(value)).toThrow(/Invalid calendar date/);
    },
  );

  it('adds days across month and year boundaries', () => {
    const octoberTrials: [CalendarDateString, number, CalendarDateString][] = [
      ['2026-10-08', 30, '2026-11-07'],
      ['2026-12-31', 1, '2027-01-01'],
      ['2024-02-28', 1, '2024-02-29'],
      ['2024-02-29', 1, '2024-03-01'],
    ];
    for (const [start, days, expected] of octoberTrials) {
      expect(addCalendarDays(start, days)).toBe(expected);
    }
  });

  it('compares calendar dates lexicographically', () => {
    expect(compareCalendarDates('2026-10-08', '2026-10-08')).toBe(0);
    expect(compareCalendarDates('2026-10-07', '2026-10-08')).toBe(-1);
    expect(compareCalendarDates('2026-10-09', '2026-10-08')).toBe(1);
  });
});