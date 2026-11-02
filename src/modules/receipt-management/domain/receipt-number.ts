export const RECEIPT_NUMBER_PREFIX = 'RCP-';
export const RECEIPT_NUMBER_WIDTH = 6;
export const RECEIPT_NUMBER_PATTERN = /^RCP-\d{6}$/;
const MAX_RECEIPT_SEQUENCE = 10 ** RECEIPT_NUMBER_WIDTH - 1;

export class InvalidReceiptNumberError extends Error {
  constructor() {
    super('Invalid receipt number.');
    this.name = 'InvalidReceiptNumberError';
  }
}

/**
 * Formats a sequential lifetime counter into a zero-padded receipt number such
 * as `RCP-000001`. Numbers are never reused once issued.
 */
export function formatReceiptNumber(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > MAX_RECEIPT_SEQUENCE) {
    throw new InvalidReceiptNumberError();
  }
  return `${RECEIPT_NUMBER_PREFIX}${String(sequence).padStart(RECEIPT_NUMBER_WIDTH, '0')}`;
}

export function isReceiptNumber(value: unknown): value is string {
  return typeof value === 'string' && RECEIPT_NUMBER_PATTERN.test(value);
}

export function parseReceiptNumber(value: string): number | null {
  if (!isReceiptNumber(value)) {
    return null;
  }
  return Number(value.slice(RECEIPT_NUMBER_PREFIX.length));
}