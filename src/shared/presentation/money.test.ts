import {
  formatDisplayAmount,
  formatFcfaAmount,
  formatMinorUnits,
  minorToEditable,
  parseMajorToMinor,
} from './money';

describe('parseMajorToMinor', () => {
  it('parses whole and decimal amounts into minor units', () => {
    expect(parseMajorToMinor('1000')).toBe(100_000);
    expect(parseMajorToMinor('1000.50')).toBe(100_050);
    expect(parseMajorToMinor('1000,5')).toBe(100_050);
    expect(parseMajorToMinor(' 12.34 ')).toBe(1234);
    expect(parseMajorToMinor('0.01')).toBe(1);
  });

  it('rejects empty, malformed and over-precise input', () => {
    expect(parseMajorToMinor('')).toBeNull();
    expect(parseMajorToMinor('abc')).toBeNull();
    expect(parseMajorToMinor('-5')).toBeNull();
    expect(parseMajorToMinor('1.234')).toBeNull();
  });
});

describe('minorToEditable', () => {
  it('renders minor units as an editable decimal string', () => {
    expect(minorToEditable(100_000)).toBe('1000.00');
    expect(minorToEditable(100_050)).toBe('1000.50');
    expect(minorToEditable(null)).toBe('');
  });
});

describe('formatMinorUnits', () => {
  it('formats minor units with two decimals regardless of locale separators', () => {
    const digits = (value: string) => value.replace(/\D/g, '');
    expect(digits(formatMinorUnits(100_050, 'en'))).toBe('100050');
    expect(digits(formatMinorUnits(100_050, 'fr'))).toBe('100050');
    expect(digits(formatMinorUnits(1, 'en'))).toBe('001');
  });
});

describe('formatFcfaAmount', () => {
  it('renders no decimals and a trailing FCFA unit', () => {
    expect(formatFcfaAmount(2_500_000, 'en')).toBe('25,000 FCFA');
    expect(formatFcfaAmount(30_000, 'en')).toBe('300 FCFA');
    expect(formatFcfaAmount(0, 'en')).toBe('0 FCFA');
  });

  it('uses the locale digit grouping', () => {
    expect(formatFcfaAmount(25_000_000, 'en')).toBe('250,000 FCFA');
    expect(formatFcfaAmount(25_000_000, 'fr')).not.toContain(',');
    expect(formatFcfaAmount(25_000_000, 'fr').replace(/\D/g, '')).toBe('250000');
  });
});

describe('formatDisplayAmount', () => {
  it('renders whole CFA francs with grouping, no decimals and a single unit', () => {
    expect(formatDisplayAmount(0, 'en')).toBe('0 FCFA');
    expect(formatDisplayAmount(25_000, 'en')).toBe('250 FCFA');
    expect(formatDisplayAmount(2_500_000, 'en')).toBe('25,000 FCFA');
    expect(formatDisplayAmount(2_500_000, 'fr').replace(/\D/g, '')).toBe('25000');
    expect(formatDisplayAmount(2_500_000, 'fr')).not.toContain(',');
  });

  it('never carries a decimal suffix for whole amounts', () => {
    expect(formatDisplayAmount(100_000, 'en')).not.toMatch(/\.\d/);
    expect(formatDisplayAmount(100_000, 'en').match(/FCFA/g)).toHaveLength(1);
  });

  it('shows fractional stored values exactly instead of silently rounding them', () => {
    expect(formatFcfaAmount(100_050, 'en')).toBe('1,001 FCFA');
    expect(formatDisplayAmount(100_050, 'en')).not.toBe('1,001 FCFA');
    expect(formatDisplayAmount(100_050, 'en').replace(/\D/g, '')).toBe('100050');
    expect(formatDisplayAmount(1, 'en')).not.toContain('FCFA');
  });
});
