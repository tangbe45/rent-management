import {
  formatReceiptNumber,
  isReceiptNumber,
  parseReceiptNumber,
  InvalidReceiptNumberError,
} from './receipt-number';

describe('receipt numbers', () => {
  it('formats a sequential counter into a zero-padded RCP number', () => {
    expect(formatReceiptNumber(1)).toBe('RCP-000001');
    expect(formatReceiptNumber(42)).toBe('RCP-000042');
    expect(formatReceiptNumber(999_999)).toBe('RCP-999999');
  });

  it('rejects a non-positive or unsafe sequence value', () => {
    expect(() => formatReceiptNumber(0)).toThrow(InvalidReceiptNumberError);
    expect(() => formatReceiptNumber(-1)).toThrow(InvalidReceiptNumberError);
    expect(() => formatReceiptNumber(1.5)).toThrow(InvalidReceiptNumberError);
    expect(() => formatReceiptNumber(1_000_000)).toThrow(InvalidReceiptNumberError);
  });

  it('recognizes only the exact six-digit pattern', () => {
    expect(isReceiptNumber('RCP-000001')).toBe(true);
    expect(isReceiptNumber('RCP-000042')).toBe(true);
    expect(isReceiptNumber('RCP-1')).toBe(false);
    expect(isReceiptNumber('RCP-1234567')).toBe(false);
    expect(isReceiptNumber('000001')).toBe(false);
    expect(isReceiptNumber('rcp-000001')).toBe(false);
    expect(isReceiptNumber(null)).toBe(false);
  });

  it('parses the issued number back to its sequence value', () => {
    expect(parseReceiptNumber('RCP-000001')).toBe(1);
    expect(parseReceiptNumber('RCP-000042')).toBe(42);
    expect(parseReceiptNumber('NOPE-000042')).toBeNull();
  });
});