import { InvalidReceiptSnapshotError } from './errors';
import {
  parseReceiptSnapshot,
  serializedReceiptSnapshot,
  validateReceiptSnapshot,
} from './receipt-snapshot';

const validSnapshot = {
  version: 1,
  language: 'en',
  receiptNumber: 'RCP-000001',
  generatedAt: 1000,
  landlord: {
    fullName: 'Landlord',
    phone: '+237 600 000 000',
    email: null,
    address: 'Yaoundé',
  },
  property: { name: 'Immeuble A', address: 'Rue 12' },
  space: { name: 'Apt 3', type: 'APARTMENT' },
  tenant: { fullName: 'Tenant', phone: null },
  payment: {
    paymentDate: '2026-01-05',
    method: 'MOBILE_MONEY',
    reference: 'MM-1',
    amount: 25_000,
  },
  allocations: [{ installmentDueDate: '2026-01-01', amount: 25_000 }],
  appearance: {
    logoIncluded: false,
    signatureMode: 'MANUAL',
    signatureIncluded: false,
    stampMode: 'MANUAL',
    stampIncluded: false,
    omittedAssets: [],
  },
};

describe('validateReceiptSnapshot', () => {
  it('accepts a complete, internally consistent snapshot', () => {
    expect(validateReceiptSnapshot(validSnapshot).receiptNumber).toBe('RCP-000001');
  });

  it('rejects an unsupported snapshot version', () => {
    expect(() => validateReceiptSnapshot({ ...validSnapshot, version: 0 })).toThrow(
      InvalidReceiptSnapshotError,
    );
  });

  it('rejects a malformed receipt number', () => {
    expect(() =>
      validateReceiptSnapshot({ ...validSnapshot, receiptNumber: 'RCP-12' }),
    ).toThrow(InvalidReceiptSnapshotError);
  });

  it('rejects allocations that do not sum to the payment amount', () => {
    expect(() =>
      validateReceiptSnapshot({
        ...validSnapshot,
        allocations: [{ installmentDueDate: '2026-01-01', amount: 25_001 }],
      }),
    ).toThrow(InvalidReceiptSnapshotError);
  });

  it('rejects an empty allocation list', () => {
    expect(() => validateReceiptSnapshot({ ...validSnapshot, allocations: [] })).toThrow(
      InvalidReceiptSnapshotError,
    );
  });

  it('rejects an invalid payment date', () => {
    expect(() =>
      validateReceiptSnapshot({
        ...validSnapshot,
        payment: { ...validSnapshot.payment, paymentDate: '05/01/2026' },
      }),
    ).toThrow(InvalidReceiptSnapshotError);
  });

  it('rejects unknown omitted asset kinds', () => {
    expect(() =>
      validateReceiptSnapshot({
        ...validSnapshot,
        appearance: { ...validSnapshot.appearance, omittedAssets: ['wax'] },
      }),
    ).toThrow(InvalidReceiptSnapshotError);
  });

  it('round-trips through serialization and parsing unchanged', () => {
    const parsed = parseReceiptSnapshot(serializedReceiptSnapshot(validateReceiptSnapshot(validSnapshot)));
    expect(parsed).toEqual(validateReceiptSnapshot(validSnapshot));
  });

  it('rejects corrupt JSON on parse', () => {
    expect(() => parseReceiptSnapshot('{not json')).toThrow(InvalidReceiptSnapshotError);
  });
});