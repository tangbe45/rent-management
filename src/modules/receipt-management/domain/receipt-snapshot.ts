import { isValidCalendarDate } from '../../../shared/domain/calendar-date';
import { InvalidReceiptSnapshotError } from './errors';
import { isReceiptNumber } from './receipt-number';

export const RECEIPT_SNAPSHOT_VERSION = 1;

export interface ReceiptLandlordSnapshot {
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface ReceiptPropertySnapshot {
  name: string;
  address: string;
}

export interface ReceiptSpaceSnapshot {
  name: string;
  type: string;
}

export interface ReceiptTenantSnapshot {
  fullName: string;
  phone: string | null;
}

export interface ReceiptPaymentSnapshot {
  paymentDate: string;
  method: string;
  reference: string | null;
  amount: number;
}

export interface ReceiptAllocationSnapshot {
  installmentDueDate: string;
  amount: number;
}

export interface ReceiptAppearanceSnapshot {
  logoIncluded: boolean;
  signatureMode: 'SAVED' | 'MANUAL';
  signatureIncluded: boolean;
  stampMode: 'SAVED' | 'MANUAL';
  stampIncluded: boolean;
  omittedAssets: readonly string[];
}

export interface ReceiptSnapshotData {
  version: typeof RECEIPT_SNAPSHOT_VERSION;
  language: 'en' | 'fr';
  receiptNumber: string;
  generatedAt: number;
  landlord: ReceiptLandlordSnapshot;
  property: ReceiptPropertySnapshot;
  space: ReceiptSpaceSnapshot;
  tenant: ReceiptTenantSnapshot;
  payment: ReceiptPaymentSnapshot;
  allocations: ReceiptAllocationSnapshot[];
  appearance: ReceiptAppearanceSnapshot;
}

function fail(reason: string): never {
  throw new InvalidReceiptSnapshotError(reason);
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    fail(`${field} must be a string or null`);
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requireInteger(value: unknown, field: string, minimum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    fail(`${field} must be an integer >= ${minimum}`);
  }
  return value;
}

function requireCalendarDate(value: unknown, field: string): string {
  const date = requireString(value, field);
  if (!isValidCalendarDate(date)) {
    fail(`${field} must be a valid YYYY-MM-DD date`);
  }
  return date;
}

function requireLanguage(value: unknown): 'en' | 'fr' {
  if (value !== 'en' && value !== 'fr') {
    fail('language must be en or fr');
  }
  return value;
}

function requireSigningMode(value: unknown): 'SAVED' | 'MANUAL' {
  if (value !== 'SAVED' && value !== 'MANUAL') {
    fail('signing mode must be SAVED or MANUAL');
  }
  return value;
}

function parseAppearance(value: unknown): ReceiptAppearanceSnapshot {
  const object = requireObject(value, 'appearance');
  const omittedAssets = object.omittedAssets;
  if (!Array.isArray(omittedAssets) || omittedAssets.some((entry) => entry !== 'logo' && entry !== 'signature' && entry !== 'stamp')) {
    fail('appearance.omittedAssets must list only logo|signature|stamp');
  }
  return {
    logoIncluded: typeof object.logoIncluded === 'boolean' ? object.logoIncluded : fail('appearance.logoIncluded must be a boolean'),
    signatureMode: requireSigningMode(object.signatureMode),
    signatureIncluded: typeof object.signatureIncluded === 'boolean' ? object.signatureIncluded : fail('appearance.signatureIncluded must be a boolean'),
    stampMode: requireSigningMode(object.stampMode),
    stampIncluded: typeof object.stampIncluded === 'boolean' ? object.stampIncluded : fail('appearance.stampIncluded must be a boolean'),
    omittedAssets: [...omittedAssets],
  };
}

/**
 * Validates an unknown parsed value into a safe, typed immutable snapshot.
 * Used both when creating a snapshot and when hydrating persisted rows, so
 * corrupt or tampered data never renders as a valid receipt.
 */
export function validateReceiptSnapshot(value: unknown): ReceiptSnapshotData {
  const object = requireObject(value, 'snapshot');

  const version = requireInteger(object.version, 'version', 0);
  if (version !== RECEIPT_SNAPSHOT_VERSION) {
    fail(`unsupported snapshot version ${version}`);
  }

  const receiptNumber = requireString(object.receiptNumber, 'receiptNumber');
  if (!isReceiptNumber(receiptNumber)) {
    fail('receiptNumber must match RCP-######');
  }

  const landlord = requireObject(object.landlord, 'landlord');
  const property = requireObject(object.property, 'property');
  const space = requireObject(object.space, 'space');
  const tenant = requireObject(object.tenant, 'tenant');
  const payment = requireObject(object.payment, 'payment');

  const allocationsValue = object.allocations;
  if (!Array.isArray(allocationsValue) || allocationsValue.length === 0) {
    fail('allocations must be a non-empty list');
  }
  const allocations = allocationsValue.map((entry) => {
    const allocation = requireObject(entry, 'allocation');
    return {
      installmentDueDate: requireCalendarDate(allocation.installmentDueDate, 'allocation.installmentDueDate'),
      amount: requireInteger(allocation.amount, 'allocation.amount', 0),
    };
  });

  const amount = requireInteger(payment.amount, 'payment.amount', 0);
  const allocatedTotal = allocations.reduce((total, allocation) => total + allocation.amount, 0);
  if (allocatedTotal !== amount) {
    fail('allocated amounts must equal the payment amount');
  }

  const snapshot: ReceiptSnapshotData = {
    version: RECEIPT_SNAPSHOT_VERSION,
    language: requireLanguage(object.language),
    receiptNumber,
    generatedAt: requireInteger(object.generatedAt, 'generatedAt', 0),
    landlord: {
      fullName: requireString(landlord.fullName, 'landlord.fullName'),
      phone: optionalString(landlord.phone, 'landlord.phone'),
      email: optionalString(landlord.email, 'landlord.email'),
      address: optionalString(landlord.address, 'landlord.address'),
    },
    property: {
      name: requireString(property.name, 'property.name'),
      address: requireString(property.address, 'property.address'),
    },
    space: {
      name: requireString(space.name, 'space.name'),
      type: requireString(space.type, 'space.type'),
    },
    tenant: {
      fullName: requireString(tenant.fullName, 'tenant.fullName'),
      phone: optionalString(tenant.phone, 'tenant.phone'),
    },
    payment: {
      paymentDate: requireCalendarDate(payment.paymentDate, 'payment.paymentDate'),
      method: requireString(payment.method, 'payment.method'),
      reference: optionalString(payment.reference, 'payment.reference'),
      amount,
    },
    allocations,
    appearance: parseAppearance(object.appearance),
  };
  return snapshot;
}

export function serializedReceiptSnapshot(snapshot: ReceiptSnapshotData): string {
  return JSON.stringify(snapshot);
}

export function parseReceiptSnapshot(json: string): ReceiptSnapshotData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    fail('invalid JSON');
  }
  return validateReceiptSnapshot(parsed);
}